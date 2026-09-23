import { SITE_URL } from "@/lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* The raw frame sequence is 143 MB of source art -- no reason to crawl it. */
        disallow: ["/api/", "/images/herosection/", "/hero-frames/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
