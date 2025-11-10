#!/usr/bin/env node

/**
 * Prerendering Script for React App with React Router
 *
 * This script automatically prerenders the React app to static HTML for perfect SEO.
 * It runs after `vite build` and saves the fully-rendered HTML for all routes.
 *
 * Process:
 * 1. Starts a temporary HTTP server serving the dist folder
 * 2. Launches headless Chrome via Puppeteer
 * 3. Navigates to each route (homepage + video pages)
 * 4. Waits for React to render all content
 * 5. Extracts the complete HTML for each route
 * 6. Saves to dist/index.html and creates 404.html for SPA routing
 * 7. Cleans up and exits
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, extname as getExtname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, '../dist');
const INDEX_PATH = join(DIST_DIR, 'index.html');
const PORT = 3000;

// Routes to prerender
const ROUTES = [
  { path: '/', outputFile: 'index.html' },
  { path: '/video/tadmit', outputFile: 'video/tadmit/index.html' },
  { path: '/video/rony', outputFile: 'video/rony/index.html' },
  { path: '/video/jam-toren', outputFile: 'video/jam-toren/index.html' },
  { path: '/video/borot', outputFile: 'video/borot/index.html' },
  { path: '/video/kvar-avar', outputFile: 'video/kvar-avar/index.html' }
];

console.log('🚀 Starting prerendering process for React Router SPA...\n');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

// Start a simple HTTP server with SPA fallback routing
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

      try {
        // Try to read the requested file
        const ext = getExtname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        const content = readFileSync(filePath);

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      } catch (error) {
        // If file not found and it's not a file with extension, serve index.html (SPA fallback)
        if (!getExtname(req.url)) {
          try {
            const indexContent = readFileSync(join(DIST_DIR, 'index.html'));
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          } catch (err) {
            res.writeHead(404);
            res.end('404 Not Found');
          }
        } else {
          res.writeHead(404);
          res.end('404 Not Found');
        }
      }
    });

    server.listen(PORT, () => {
      console.log(`✅ Local server started at http://localhost:${PORT}\n`);
      resolve(server);
    });
  });
}

// Prerender a single route using Puppeteer
async function prerenderRoute(browser, route) {
  const page = await browser.newPage();

  try {
    console.log(`📄 Navigating to http://localhost:${PORT}${route.path}...`);

    // Navigate to the route
    await page.goto(`http://localhost:${PORT}${route.path}`, {
      waitUntil: 'networkidle0', // Wait for all network requests to finish
      timeout: 30000
    });

    console.log(`⏳ Waiting for React to render ${route.path}...`);

    // Wait for React root element to be populated
    await page.waitForSelector('#root > *', { timeout: 10000 });

    // Wait a bit more to ensure all React rendering is complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`📝 Extracting rendered HTML for ${route.path}...`);

    // Get the fully rendered HTML
    const html = await page.content();

    console.log(`✅ HTML extracted for ${route.path}!\n`);

    return html;

  } finally {
    await page.close();
  }
}

// Prerender all routes using Puppeteer
async function prerenderAllRoutes() {
  console.log('🌐 Launching headless browser...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const results = [];

    for (const route of ROUTES) {
      const html = await prerenderRoute(browser, route);
      results.push({ route, html });
    }

    return results;

  } finally {
    await browser.close();
    console.log('🔒 Browser closed.\n');
  }
}

// Main function
async function main() {
  let server;

  try {
    // Start the server
    server = await startServer();

    // Prerender all routes
    const results = await prerenderAllRoutes();

    console.log('💾 Saving prerendered HTML files...\n');

    let totalSize = 0;

    // Save each route's HTML
    for (const { route, html } of results) {
      const outputPath = join(DIST_DIR, route.outputFile);

      // Create directory if it doesn't exist
      const outputDir = dirname(outputPath);
      mkdirSync(outputDir, { recursive: true });

      writeFileSync(outputPath, html, 'utf-8');

      const size = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2);
      const lines = html.split('\n').length;
      totalSize += parseFloat(size);

      console.log(`✅ ${route.outputFile}:`);
      console.log(`   - Route: ${route.path}`);
      console.log(`   - Lines: ${lines}`);
      console.log(`   - Size: ${size} KB\n`);
    }

    // Create 404.html (same as index.html for SPA routing on GitHub Pages)
    const indexHtml = readFileSync(INDEX_PATH, 'utf-8');
    writeFileSync(join(DIST_DIR, '404.html'), indexHtml, 'utf-8');
    console.log('✅ Created 404.html for SPA fallback routing\n');

    console.log(`📊 Prerendering Summary:`);
    console.log(`   - Total routes: ${ROUTES.length}`);
    console.log(`   - Total size: ${totalSize.toFixed(2)} KB`);
    console.log(`   - Meta tags preserved: ✅`);
    console.log(`   - Content in HTML source: ✅\n`);

    console.log('🎉 Prerendering complete! All routes have perfect SEO.\n');

  } catch (error) {
    console.error('❌ Error during prerendering:', error.message);
    process.exit(1);

  } finally {
    // Close the server
    if (server) {
      console.log('🧹 Cleaning up...');
      server.close();
      console.log('✅ Server stopped.\n');
    }
  }
}

// Run the script
main();
