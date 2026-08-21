import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadFormSubmissionSchema } from "@/lib/schemas/lead-form";
import { normalizeEmail } from "@/lib/string-utils";

// Public, unauthenticated endpoint. Landing pages POST here.
// Response is always JSON; never leak stack traces.

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Two independent buckets: per-IP and per-email.
// IP limit catches bulk bots; email limit catches bots that rotate IPs.
// In a multi-instance production environment, swap for a Redis counter.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const IP_MAX = 5;
const EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_MAX = 3; // 3 submissions from the same email per hour

const ipBuckets = new Map<string, Bucket>();
const emailBuckets = new Map<string, Bucket>();

function checkBucket(
  map: Map<string, Bucket>,
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Probabilistic prune to prevent unbounded Map growth (~1% of calls).
  if (Math.random() < 0.01) {
    for (const [k, b] of map) {
      if (now > b.resetAt) map.delete(k);
    }
  }

  const bucket = map.get(key);
  if (!bucket || now > bucket.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function getClientIp(request: Request): string {
  // Respect X-Forwarded-For when behind a reverse proxy / CDN.
  // Takes the first (original-client) IP from a potentially comma-separated list.
  const forwarded =
    (request.headers as Headers).get("x-forwarded-for") ??
    (request.headers as Headers).get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// ── Body size guard ───────────────────────────────────────────────────────────
// Reject payloads larger than 16 KB before parsing JSON. Prevents DoS via
// enormous bodies that tie up the JSON parser.
const MAX_BODY_BYTES = 16 * 1024;

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // 1. Body size guard
  const contentLength = Number(
    (request.headers as Headers).get("content-length") ?? "0"
  );
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Malformed request." },
      { status: 413 }
    );
  }

  // 2. Per-IP rate limit
  const ip = getClientIp(request);
  const ipCheck = checkBucket(ipBuckets, ip, IP_MAX, IP_WINDOW_MS);
  if (!ipCheck.allowed) {
    const mins = Math.ceil(ipCheck.retryAfterSec / 60);
    return NextResponse.json(
      {
        ok: false,
        error: `Too many submissions. Please wait ${mins} minute${mins > 1 ? "s" : ""} before trying again.`,
      },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec) } }
    );
  }

  // 3. Parse & validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request." },
      { status: 400 }
    );
  }

  const parsed = leadFormSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please check your details.",
      },
      { status: 400 }
    );
  }

  const d = parsed.data;

  // 4. Honeypot check — silently return success so the bot gets no signal.
  //    Real users never see or touch this field (it is hidden in the form).
  if (d.hp && d.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  // 5. Per-email rate limit (secondary, catches IP-rotating bots)
  const emailKey = d.email.trim().toLowerCase();
  const emailCheck = checkBucket(emailBuckets, emailKey, EMAIL_MAX, EMAIL_WINDOW_MS);
  if (!emailCheck.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "This email address has been submitted too many times recently. Please try again later.",
      },
      { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSec) } }
    );
  }

  // 6. Resolve landing page
  const page = await prisma.landingPage.findUnique({
    where: { id: d.landingPageId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, courseId: true },
  });
  if (!page) {
    return NextResponse.json(
      { ok: false, error: "This form is no longer available." },
      { status: 404 }
    );
  }

  // 7. Persist lead
  const trimmed = d.name.trim();
  const spaceIdx = trimmed.indexOf(" ");
  const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const lastName = spaceIdx === -1 ? null : trimmed.slice(spaceIdx + 1).trim() || null;
  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);
  const email = normalizeEmail(d.email) ?? emptyToNull(d.email);
  const phone = emptyToNull(d.phone);

  // Try to map utmCampaign → Campaign.id for attribution.
  // Failure is non-fatal: if the campaign lookup fails or finds nothing, lead is still created.
  const campaignId = d.utmCampaign
    ? await prisma.campaign
        .findFirst({
          where: {
            OR: [
              { name: { equals: d.utmCampaign, mode: "insensitive" } },
              { source: { equals: d.utmCampaign, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        })
        .then((c) => c?.id ?? null)
        .catch(() => null)
    : null;

  // Advisory duplicate check before creation — log only, never block submission.
  if (email || phone) {
    void (async () => {
      try {
        const where = email
          ? { email: { equals: email, mode: "insensitive" as const } }
          : { phone: { contains: phone! } };
        const existing = await prisma.lead.findFirst({ where, select: { id: true, email: true } });
        if (existing) {
          console.info("[from-landing] potential duplicate lead", {
            existingId: existing.id,
            submittedEmail: email,
          });
        }
      } catch {
        // Non-blocking — ignore errors from advisory check
      }
    })();
  }

  try {
    await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        notes: emptyToNull(d.message),
        source: page.slug,
        campaignId,
        status: "NEW",
        subscribed: d.subscribed,
        utmSource: d.utmSource ?? null,
        utmMedium: d.utmMedium ?? null,
        utmCampaign: d.utmCampaign ?? null,
        courseId: page.courseId ?? null,
      },
    });
  } catch (err) {
    console.error("Lead submission failed", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
