import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true, // Consistent URLs with trailing slashes
  // Removed output: 'export' - using full Next.js features on Vercel
  // Removed images.unoptimized - using Vercel's automatic image optimization
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
