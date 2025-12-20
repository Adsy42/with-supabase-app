import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled cacheComponents to allow dynamic routes without static params
  // These routes require runtime data fetching (auth, user-specific data)
  cacheComponents: false,
};

export default nextConfig;
