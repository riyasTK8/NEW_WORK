import { PROJECTS } from "@/lib/projects";
import { SITE, SITE_URL } from "@/lib/site";

/**
 * JSON-LD for the landing page.
 *
 * Server-rendered into the HTML so crawlers see it without executing any
 * JavaScript. Everything asserted here is also visible on the page — schema
 * that describes content a user cannot see is a manual-action risk.
 */
export default function StructuredData() {
  const graph = [
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#organization`,
      name: SITE.name,
      legalName: SITE.legalName,
      url: SITE_URL,
      description: SITE.description,
      email: SITE.email,
      telephone: SITE.phone,
      founder: { "@type": "Person", name: SITE.founder },
      knowsAbout: SITE.expertise,
      sameAs: SITE.sameAs,
      areaServed: { "@type": "Place", name: "Worldwide" },
      serviceType: [
        "Custom software development",
        "ERP and CRM development",
        "Web application development",
        "API and backend development",
        "Cloud infrastructure and DevOps",
        "AI integration",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "ItemList",
      "@id": `${SITE_URL}/#work`,
      name: "Case studies",
      description:
        "Production systems designed, built and deployed by NexViva.",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: PROJECTS.length,
      itemListElement: PROJECTS.map((project, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "SoftwareApplication",
          "@id": `${SITE_URL}/#${project.id}`,
          name: project.name,
          applicationCategory: project.category,
          operatingSystem: "Web",
          description: project.summary,
          /* Only assert a URL for the one that is actually live. */
          ...(project.href ? { url: project.href } : {}),
          ...(project.datePublished
            ? { datePublished: project.datePublished }
            : {}),
          author: { "@id": `${SITE_URL}/#organization` },
          keywords: project.stack.join(", "),
        },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Values are authored in this repo, not user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
