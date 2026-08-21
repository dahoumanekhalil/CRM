import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FormField } from "@/lib/forms/types";

// Per-IP rate limiting (in-memory, single instance dev-suitable).
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function corsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

async function tryCreateLead(
  formName: string,
  fields: FormField[],
  data: Record<string, unknown>
): Promise<void> {
  try {
    const str = (fieldId: string) => {
      const v = data[fieldId];
      return typeof v === "string" ? v.trim() : "";
    };

    const emailField = fields.find((f) => f.type === "email");
    const phoneField = fields.find((f) => f.type === "phone");
    const nameField = fields.find(
      (f) => f.type === "text" && /name|nom|اسم/i.test(f.label)
    );
    const consentField = fields.find(
      (f) => f.type === "checkbox" && /consent|subscri|agree|optin/i.test(f.label)
    );

    const email = emailField ? str(emailField.id) || undefined : undefined;
    const phone = phoneField ? str(phoneField.id) || undefined : undefined;

    // Skip if no way to contact this person.
    if (!email && !phone) return;

    // Avoid duplicate leads by email.
    if (email) {
      const existing = await prisma.lead.findFirst({
        where: { email },
        select: { id: true },
      });
      if (existing) return;
    }

    const fullName = nameField ? str(nameField.id) : "";
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || email?.split("@")[0] || phone || "Unknown";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    const subscribed =
      consentField ? data[consentField.id] !== false : true;

    await prisma.lead.create({
      data: {
        firstName,
        lastName: lastName ?? null,
        email: email ?? null,
        phone: phone ?? null,
        source: `Form: ${formName}`,
        subscribed: !!subscribed,
      },
    });
  } catch (err) {
    // Non-fatal — submission is already saved.
    console.error("[forms/submit] lead creation failed:", err);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // Rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRate(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429, headers }
    );
  }

  try {
    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) {
      return NextResponse.json(
        { ok: false, error: "Form not found." },
        { status: 404, headers }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400, headers }
      );
    }

    // Honeypot — silently succeed if filled (bot detection).
    if (body._hp) {
      return NextResponse.json({ ok: true }, { headers });
    }

    const fields = Array.isArray(form.fields) ? (form.fields as unknown as FormField[]) : [];

    // Validate required fields.
    for (const field of fields) {
      if (field.required) {
        const value = body[field.id];
        const empty =
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (field.type === "checkbox" && value === false);
        if (empty) {
          return NextResponse.json(
            { ok: false, error: `"${field.label}" is required.` },
            { status: 422, headers }
          );
        }
      }
    }

    // Strip unknown keys — only store declared field IDs.
    const fieldIds = new Set(fields.map((f) => f.id));
    const cleanData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(body)) {
      if (fieldIds.has(key)) cleanData[key] = val;
    }

    await prisma.formSubmission.create({
      data: {
        formId: id,
        data: cleanData as object,
        metadata: {
          ip,
          userAgent: request.headers.get("user-agent"),
          origin,
          referer: request.headers.get("referer"),
        } as object,
      },
    });

    // Auto-create a lead from the submission if it contains contact info.
    await tryCreateLead(form.name, fields, cleanData);

    return NextResponse.json({ ok: true }, { headers });
  } catch (err) {
    console.error("[forms/submit]", err);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred." },
      { status: 500, headers }
    );
  }
}
