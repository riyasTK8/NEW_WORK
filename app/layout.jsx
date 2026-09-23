import { Inter } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";
import { SITE, SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    /*
     * Leads with the brand, then the two phrases people actually search.
     * Kept under ~60 characters so Google does not truncate it.
     */
    default: "NexViva — Full-Stack Web & Software Development Studio",
    template: "%s · NexViva",
  },
  description: SITE.description,
  keywords: SITE.expertise,
  applicationName: SITE.name,
  authors: [{ name: SITE.founder, url: SITE.sameAs[1] }],
  creator: SITE.founder,
  publisher: SITE.name,
  alternates: { canonical: "/" },
  category: "technology",
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    locale: SITE.locale,
    title: "NexViva — Full-Stack Web & Software Development Studio",
    description:
      "Custom ERP and CRM platforms, property management systems and AI-powered tools, built end to end with Next.js, Node.js and TypeScript.",
    images: [
      {
        url: "/hero-frames/poster.webp",
        width: 1600,
        height: 900,
        alt: "NexViva — full-stack software development studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexViva — Full-Stack Web & Software Development Studio",
    description:
      "Custom ERP and CRM platforms, property management systems and AI-powered tools, built end to end.",
    images: ["/hero-frames/poster.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/*
         * Framer Motion server-renders each `initial` variant, so ~37 nodes
         * arrive with inline `opacity:0`. That is correct once hydration runs,
         * but with JavaScript blocked -- or a chunk that fails to load -- the
         * whole page below the hero would stay invisible. This reveals them,
         * and costs nothing when scripting is enabled.
         */}
        <noscript>
          <style>{`
            [style*="opacity:0"]{opacity:1!important;transform:none!important}
            /* Collapse the hero's scroll runway when nothing can scrub it. */
            #top{height:auto!important}
            [data-hero-panel]{position:relative!important}
          `}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
