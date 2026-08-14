import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/primitives/page-header";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const user = session.user;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Account" description="Manage your profile and security settings." />
      <div className="flex-1 space-y-8 px-6 py-8 max-w-2xl">
        <ProfileForm name={user.name ?? ""} email={user.email ?? ""} />
        <hr className="border-border/60" />
        <PasswordForm hasPassword={!!user.email} />
      </div>
    </div>
  );
}
