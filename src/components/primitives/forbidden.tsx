import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ForbiddenProps {
  title?: string;
  description?: string;
  hint?: string;
}

// Rendered in place when a signed-in user lacks the required permission.
// Keeps them on the URL so the link can be shared with someone who *does*
// have access without them having to guess where they were sent.
export function Forbidden({
  title = "You can't view this",
  description = "This part of Webscale is scoped to a different role.",
  hint,
}: ForbiddenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md space-y-5 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
          <Lock className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {hint ? (
          <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="mailto:admin@webscale.dev">Ask an admin</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
