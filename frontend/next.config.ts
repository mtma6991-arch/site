import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/master/guide": ["./content/**/*"],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const internal = process.env.INTERNAL_API_URL || "http://127.0.0.1:8090";
    return [{ source: "/api/:path*", destination: `${internal}/api/:path*` }];
  },
};

export default nextConfig;
