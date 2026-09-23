/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve modern formats first; next/image negotiates via the Accept header.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  // Only pull the icons actually imported into the client bundle.
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons/fa6", "framer-motion"],
  },
};

export default nextConfig;
