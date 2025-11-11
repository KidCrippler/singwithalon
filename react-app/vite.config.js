import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false
    }),
    // Brotli compression (better than gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false
    })
  ],
  build: {
    // Split code into smaller chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-carousel': ['embla-carousel-react', 'embla-carousel-autoplay'],
          'vendor-router': ['react-router-dom', 'react-helmet-async']
        }
      }
    },
    // Better compression with esbuild (faster and built-in)
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'], // Remove console.logs and debugger in production
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 600,
    // Generate sourcemaps for debugging (optional, remove if not needed)
    sourcemap: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'embla-carousel-react']
  }
})
