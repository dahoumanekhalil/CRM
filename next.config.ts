import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle at .next/standalone — required so the
  // production Containerfile can copy just the runtime files instead of the
  // full node_modules tree.
  output: "standalone",

  // Allow the local network IP so the dev server is accessible from mobile
  // devices on the same Wi-Fi network (e.g. for testing on a real phone).
  allowedDevOrigins: ["192.168.1.11"],
};

export default nextConfig;
