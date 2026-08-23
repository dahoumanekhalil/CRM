import Link from "next/link";
import Image from "next/image";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-6 text-center">
        <Link href="/dashboard" className="mx-auto block">
          <Image
            src="/logo.webp"
            alt="Webscale"
            width={1536}
            height={1024}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <div className="space-y-2">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
            <FileQuestion className="size-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Error 404 · Webscale CRM
        </p>
      </div>
    </div>
  );
}
