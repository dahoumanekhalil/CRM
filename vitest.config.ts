import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/app/(app)/settings/telegram/**/*.ts",
        "src/app/(app)/settings/notifications/**/*.ts",
        "src/app/api/telegram/**/*.ts",
        "src/app/api/cron/**/*.ts",
      ],
    },
  },
});
