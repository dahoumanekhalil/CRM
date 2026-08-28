import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinClient } from "./join-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ room: string }>;
}): Promise<Metadata> {
  const { room } = await params;
  const roomName = decodeURIComponent(room);
  return { title: `Join ${roomName}` };
}

function StaticPage({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm space-y-3">
        <div className="text-4xl">{emoji}</div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  const roomName = decodeURIComponent(room);

  // Basic validation — room names must be URL-safe identifiers.
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(roomName)) notFound();

  // 29.3 — If this room belongs to a LiveSession, gate on status before rendering the form.
  const liveSession = await prisma.liveSession.findUnique({
    where: { roomName },
    select: { status: true },
  }).catch(() => null);

  if (liveSession) {
    const status = liveSession.status as string;
    if (status === "SCHEDULED") {
      return (
        <StaticPage
          emoji="⏳"
          title="Session hasn't started yet"
          body="The trainer hasn't opened the classroom yet. Check back when the session is live."
        />
      );
    }
    if (status !== "LIVE" && status !== "WAITING") {
      return (
        <StaticPage
          emoji="🎓"
          title="Session has ended"
          body="This live class is no longer available. The session has ended."
        />
      );
    }
  }

  return <JoinClient roomName={roomName} />;
}
