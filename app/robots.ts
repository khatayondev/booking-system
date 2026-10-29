import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "https://beccascrown.gh";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/book", "/our-services", "/gallery", "/contact", "/policies", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/dashboard/",
        "/dashboard/*",
        "/manage/",
        "/manage/*",
        "/pos/",
        "/pos/*",
        "/reports/",
        "/reports/*",
        "/audit/",
        "/audit/*",
        "/services/",
        "/services/*",
        "/staff/",
        "/staff/*",
        "/settings/",
        "/settings/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
