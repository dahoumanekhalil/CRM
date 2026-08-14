import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the local network IP so the dev server is accessible from mobile
  // devices on the same Wi-Fi network (e.g. for testing on a real phone).
  allowedDevOrigins: ["192.168.100.7"],
};

export default nextConfig;
