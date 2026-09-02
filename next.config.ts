import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle at .next/standalone — required so the
  // production Containerfile can copy just the runtime files instead of the
  // full node_modules tree.
  output: "standalone",

  typescript: {
    // In the container build the type check runs as a dedicated `tsc --noEmit`
    // step (see _production/Containerfile) so its ~1.4 GB heap does not stack on
    // top of `next build`'s own memory — that stacking OOM-kills the build on
    // the 8 GB / no-swap host. GitHub and Vercel leave DOCKER_BUILD unset and
    // get the normal in-build type check.
    ignoreBuildErrors: process.env.DOCKER_BUILD === "1",
  },

  // Allow the local network IP so the dev server is accessible from mobile
  // devices on the same Wi-Fi network (e.g. for testing on a real phone).
  allowedDevOrigins: ["192.168.1.11"],
};

export default nextConfig;
