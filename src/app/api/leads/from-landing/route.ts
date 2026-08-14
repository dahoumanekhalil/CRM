import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadFormSubmissionSchema } from "@/lib/schemas/lead-form";

// Public, unauthenticated endpoint. Landing pages POST here.
// Response is always JSON; never leak stack traces.

// ── Simple in-memory rate limiter ──────────────────────────────────────────
// Max 5 submissions per IP per 10 minutes. Resets per-IP after the window.
// In a multi-instance production environment, swap this for a Redis counter.
// For a single-server internal CRM, this is more than sufficient.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, Bucket>();

// Evict stale buckets so the Map doesn't grow indefinitely.
function pruneExpired() {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(ip);
  }
}

function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  // Prune occasionally (every ~100 calls statistically).
  if (Math.random() < 0.01) pruneExpired();

  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= MAX_PER_WINDOW) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function getClientIp(request: Request): string {
  // Respect X-Forwarded-For when behind a reverse proxy / CDN.
  const forwarded =
    (request.headers as Headers).get("x-forwarded-for") ??
    (request.headers as Headers).get("x-real-ip");
  if (forwarded) {
    // Take the first (original) IP from a potentially comma-separated list.
    return forwarded.split(",")[0].trim();
  }
  // Fallback — no IP discernible (should rarely happen in practice).
  return "unknown";
}

export async function POST(request: Request) {
  // ── Rate limit ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many submissions. Please wait ${Math.ceil(retryAfterSec / 60)} minute${retryAfterSec > 119 ? "s" : ""} before trying again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  // ── Parse & validate ──────────────────────────────────────────────────
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

  const page = await prisma.landingPage.findUnique({
    where: { id: d.landingPageId },
    select: {
      id: true,
      title: true,
      courseId: true,
    },
  });
  if (!page) {
    return NextResponse.json(
      { ok: false, error: "This form is no longer available." },
      { status: 404 }
    );
  }

  const trimmed = d.name.trim();
  const spaceIdx = trimmed.indexOf(" ");
  const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const lastName = spaceIdx === -1 ? null : trimmed.slice(spaceIdx + 1).trim();

  const emptyToNull = (v: string) => (v.trim() === "" ? null : v);

  try {
    await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email: d.email,
        phone: emptyToNull(d.phone),
        notes: emptyToNull(d.message),
        source: `Landing page: ${page.title}`,
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
