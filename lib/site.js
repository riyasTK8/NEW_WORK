/**
 * Canonical site configuration.
 *
 * Set NEXT_PUBLIC_SITE_URL in the deploy environment to the real domain —
 * canonical tags, Open Graph URLs, the sitemap and the JSON-LD all read from
 * here, so a wrong value is wrong everywhere at once.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://nexviva.dev"
).replace(/\/$/, "");

export const SITE = {
  name: "NexViva",
  legalName: "NexViva",
  tagline: "Full-stack web & software development studio",
  description:
    "NexViva builds production web software end to end — custom ERP and CRM platforms, property management systems and AI-powered tools — with Next.js, Node.js, TypeScript and PostgreSQL.",
  founder: "Muhammed Riyas",
  email: "hello@nexviva.dev",
  phone: "+91 9037753791",
  locale: "en_IN",
  sameAs: [
    "https://github.com/riyasTK8",
    "https://www.linkedin.com/in/riyas-k-i",
  ],
  /* Feeds schema.org knowsAbout and the keywords meta. */
  expertise: [
    "Full-stack web development",
    "Next.js development",
    "Node.js development",
    "TypeScript",
    "Custom ERP software development",
    "CRM platform development",
    "Microservices architecture",
    "REST API development",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "RabbitMQ",
    "AWS cloud infrastructure",
    "AI integration",
    "SaaS product development",
  ],
};
