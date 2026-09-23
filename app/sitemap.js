import { SITE_URL } from "@/lib/site";

/** Single-page site: the root plus its section anchors. */
export default function sitemap() {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
  ];
}
