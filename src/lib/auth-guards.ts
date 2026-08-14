import "server-only";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "./permissions";

/**
 * Guards a server action.
 *
 * Throws so the caller's `try/catch` (or Next's error boundary) surfaces it.
 * Pair with `try { … } catch (e) { return { ok: false, error: … } }` inside
 * the action so callers get a friendly `{ ok: false }` instead of a stack.
 */
export async function requirePermissionAction(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  if (!hasPermission(session.user.role, permission)) {
    throw new Error("You don't have permission for this action.");
  }
  return session;
}

/**
 * Guards a server component / page. Returns the session if allowed, or `null`
 * if the user lacks the permission — the caller then renders `<Forbidden />`.
 * We deliberately don't redirect: staying on the URL is friendlier when a
 * teammate shares a link the recipient can't open.
 */
export async function requirePermissionPage(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) return { session: null, allowed: false as const };
  if (!hasPermission(session.user.role, permission)) {
    return { session, allowed: false as const };
  }
  return { session, allowed: true as const };
}
