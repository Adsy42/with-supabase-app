import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable cacheComponents for this app since it's data-heavy with authentication
  // and real-time chat features that require dynamic data access
  cacheComponents: false,
};

export default nextConfig;
