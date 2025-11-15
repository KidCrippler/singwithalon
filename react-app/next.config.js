/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true, // Consistent URLs with trailing slashes
  // Removed output: 'export' - using full Next.js features on Vercel
  // Removed images.unoptimized - using Vercel's automatic image optimization
}

export default nextConfig
