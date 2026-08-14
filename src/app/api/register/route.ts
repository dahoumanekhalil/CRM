import { NextResponse } from "next/server";

// Self-registration is disabled. Accounts are created by admins via
// Settings → Team → Invite member. Keeping this route to avoid 404s
// but returning a clear error for any client still POSTing here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Self-registration is disabled. Ask your admin to invite you via Settings.",
    },
    { status: 403 }
  );
}
