import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { type NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Build a connect-src directive that lets the browser open WebSocket + HTTP
// connections to the LiveKit server. Without this, the browser's default
// same-origin CSP blocks the RTC signalling handshake.
const livekitWs = process.env.LIVEKIT_URL ?? "";
const livekitHttp = livekitWs
  .replace(/^ws:\/\//, "http://")
  .replace(/^wss:\/\//, "https://");

export default auth(function proxy(_req: NextRequest) {
  const res = NextResponse.next();

  const parts = ["'self'", livekitWs, livekitHttp].filter(Boolean);
  // In development the LAN IP can change; allow all ws/wss origins so you
  // don't have to restart the server every time you switch networks.
  if (process.env.NODE_ENV !== "production") parts.push("ws:", "wss:");

  res.headers.set("Content-Security-Policy", `connect-src ${parts.join(" ")}`);
  return res;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
