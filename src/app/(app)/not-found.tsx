import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

// Rendered inside the app shell (sidebar stays visible).
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
          <FileQuestion className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This page doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leads">Leads</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
