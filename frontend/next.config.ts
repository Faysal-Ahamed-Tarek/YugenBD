import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dedicated /search route was folded into the Shop page. Redirect old
  // links/bookmarks to /products; the ?q= query string is preserved automatically.
  async redirects() {
    return [{ source: "/search", destination: "/products", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
