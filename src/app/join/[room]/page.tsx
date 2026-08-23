import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinClient } from "./join-client";

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

export default async function JoinPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  const roomName = decodeURIComponent(room);

  // Basic validation — room names must be URL-safe identifiers.
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(roomName)) notFound();

  return <JoinClient roomName={roomName} />;
}
