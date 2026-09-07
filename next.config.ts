import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sprites de arquetipo servidos por Limitless.
    remotePatterns: [{ protocol: "https", hostname: "r2.limitlesstcg.net" }],
  },
};

export default nextConfig;
