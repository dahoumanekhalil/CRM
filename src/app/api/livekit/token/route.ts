// POST /api/livekit/token
//
// HTTP-callable LiveKit token endpoint — platform-neutral.
// Can be called by any HTTP client: web browser, React Native, server-to-server.
//
// Authentication: session cookie (obtained via /api/auth/signin).
// Any client that can hold a cookie or pass the session token header can call this.
//
// Request body (JSON):
//   { room: string; name: string; role: "host" | "student" }
//
// Response 200:
//   { token: string; url: string }
//
// Response 400: invalid body
// Response 401: not authenticated
// Response 403: role not permitted
// Response 500: server misconfiguration

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { generateHostToken, generateStudentToken, validateRoomName } from "@/lib/livekit/token";
import { getValidatedLivekitUrl } from "@/lib/livekit/config";
import { z } from "zod";

const bodySchema = z.object({
  room: z.string().min(1).max(50),
  name: z.string().min(1).max(80),
  role: z.enum(["host", "student"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { room, name, role } = parsed.data;

  try {
    validateRoomName(room);
  } catch {
    return NextResponse.json({ error: "Invalid room name. Use only letters, numbers, hyphens, and underscores (max 50 characters)." }, { status: 400 });
  }

  let url: string;
  try {
    url = getValidatedLivekitUrl();
  } catch {
    return NextResponse.json({ error: "Meeting server is not configured." }, { status: 500 });
  }

  if (role === "host") {
    if (!hasPermission(session.user.role, "live.host")) {
      return NextResponse.json({ error: "You do not have permission to host a live session." }, { status: 403 });
    }
    const identity = `host_${session.user.id}`;
    const token = await generateHostToken(identity, name, room);
    return NextResponse.json({ token, url });
  }

  // role === "student"
  if (!hasPermission(session.user.role, "live.view")) {
    return NextResponse.json({ error: "You do not have permission to join a live session." }, { status: 403 });
  }
  const suffix = Math.random().toString(36).slice(2, 8);
  const identity = `student_${session.user.id}_${suffix}`;
  const token = await generateStudentToken(identity, name, room);
  return NextResponse.json({ token, url });
}
