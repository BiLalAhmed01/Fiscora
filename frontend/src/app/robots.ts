import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated app screens have nothing for a crawler to index and
        // would just waste crawl budget / potentially expose empty-state UI.
        disallow: ["/chat", "/dashboard", "/onboarding"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
