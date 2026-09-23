import instaviz from "@/public/projects/instaviz.webp";
import letsellr from "@/public/projects/letsellr.webp";
import xerocare from "@/public/projects/xerocare.webp";

/**
 * Case studies, shared by the rendered section and the JSON-LD.
 *
 * Deliberately one source: structured data that disagrees with what is on the
 * page is a manual-action risk, not just an inaccuracy.
 *
 * Every figure here is one the client or the codebase can back up.
 */
export const PROJECTS = [
  {
    id: "xerocare",
    name: "XeroCare",
    kicker: "ERP & CRM platform",
    status: "In development",
    category: "BusinessApplication",
    image: xerocare,
    alt: "XeroCare microservices ERP and CRM dashboard for printer industry operations",
    summary:
      "A microservices ERP and CRM platform for printer industry operations. Lead management, customer 360°, sales pipeline, quotation builder and rental workflows run alongside inventory and service modules covering serial-number tracking, multi-location stock, automated purchasing, AMC contracts and SLA-monitored ticketing. Secured with JWT and refresh tokens, RBAC, 2FA and full audit logging for multi-branch access control.",
    metric: "Engineered for 5,000+ concurrent users at sub-200ms API response",
    stack: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "Redis", "RabbitMQ"],
  },
  {
    id: "letsellr",
    name: "Letsellr",
    kicker: "Property management platform",
    status: "Live since October 2025",
    datePublished: "2025-10",
    href: "https://letsellr.in",
    category: "BusinessApplication",
    image: letsellr,
    alt: "Letsellr property management platform for listing and tracking properties",
    summary:
      "A full-stack property management platform for listing, tracking and managing properties, built to tighten the loop between clients and contractors. Image uploads go straight to AWS S3 through signed URLs rather than through the API. Delivered end to end as a freelance engagement — UI/UX design through to backend and infrastructure.",
    metric: "80% smaller backend payload, 60% faster uploads",
    stack: ["Next.js", "TypeScript", "Node.js", "MongoDB", "AWS EC2", "AWS S3"],
  },
  {
    id: "instaviz",
    name: "InstaViz",
    kicker: "AI data visualization",
    status: "Shipped November 2025",
    datePublished: "2025-11",
    category: "DeveloperApplication",
    image: instaviz,
    alt: "InstaViz AI data visualization tool turning CSV uploads into charts and insights",
    summary:
      "An AI data visualisation tool that turns CSV uploads into dynamic charts and written insights. Two Gemini models split the work — one for chart generation, a lighter one for conversation — while an MCP server aggregates CSV data to cut redundant API calls. Google OAuth, Stripe payments and device-level session tracking with remote logout complete the platform.",
    metric: "50% lower token usage via MCP aggregation",
    stack: ["Next.js", "TypeScript", "Node.js", "MongoDB", "Gemini API", "MCP", "Stripe"],
  },
];
