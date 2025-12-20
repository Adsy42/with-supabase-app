import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled cacheComponents due to dynamic route issues with uncached data
  // cacheComponents: true,
};

export default nextConfig;
