import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { getUnreadCount } from "@/lib/notifications";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const unreadCount = await getUnreadCount(session.user.id);

  return (
    <AppShell session={session} initialUnreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
