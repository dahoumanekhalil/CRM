import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LiveTestClient } from "./live-test-client";

export const metadata: Metadata = { title: "Live Room Diagnostics" };
export const dynamic = "force-dynamic";

export default async function LiveTestPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  // Restrict to ADMIN only — this is a diagnostics page, not a product feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return <LiveTestClient />;
}
