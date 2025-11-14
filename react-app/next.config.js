/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for GitHub Pages compatibility
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Better for static hosting
}

export default nextConfig
