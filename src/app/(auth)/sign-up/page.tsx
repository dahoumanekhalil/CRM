import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Self-registration is disabled — accounts are created by admins via the
// Settings → Team page. Keeping the route so existing bookmark links don't 404,
// but surfacing a clear explanation instead of a broken form.
export default function SignUpPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <Link
          href="/"
          className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground"
        >
          W
        </Link>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted/50 text-muted-foreground">
          <Lock className="size-5" />
        </div>
        <CardTitle className="text-xl">Webscale is invite-only</CardTitle>
        <CardDescription>
          Accounts are created by your organization&apos;s admin. You can&apos;t
          self-register.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
        <p>
          If you should have access, ask your admin to add you from{" "}
          <strong className="text-foreground">Settings → Team → Invite member</strong>.
        </p>
        <p>
          They&apos;ll create your account and share your login credentials.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Already have credentials?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
