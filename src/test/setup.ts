// Global test setup — mock modules that cannot run outside Next.js runtime.
import { vi } from "vitest";

// next/cache is unavailable in the test environment.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

// server-only is a compile-time guard that throws at import time outside Next.js.
vi.mock("server-only", () => ({}));
