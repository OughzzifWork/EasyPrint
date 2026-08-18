import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["http://172.16.1.172:3000"],
};

export default nextConfig;
