import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / transactional routes — nothing here belongs in an index.
      disallow: [
        "/cart",
        "/checkout",
        "/account",
        "/dashboard",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/order-confirmation",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
