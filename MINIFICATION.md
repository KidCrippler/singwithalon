# Minification Instructions

This document explains how to keep minified files synchronized with their source files.

## Current Setup

The website uses minified versions of CSS and JavaScript files for better performance:
- `css/styles.min.css` (minified from `css/styles.css`)
- `css/video-pages.min.css` (minified from `css/video-pages.css`)  
- `js/script.min.js` (minified from `js/script.js`)

The HTML already references the minified files.

## Tools Required

Make sure these are installed globally:
```bash
npm install -g cssnano-cli terser
```

## After Making Changes

**Option 1: Use the build script (Recommended)**
```bash
./build.sh
```

**Option 2: Manual commands**
```bash
# Minify CSS files
cssnano css/styles.css css/styles.min.css
cssnano css/video-pages.css css/video-pages.min.css

# Minify JS files
terser js/script.js -c -m -o js/script.min.js
```

## Important Notes

- The HTML already references `.min.css` and `.min.js` files
- Always run minification after editing source files
- The build script shows file size savings
- Never edit minified files directly - they will be overwritten

## File Size Benefits

Current minification provides significant size reduction:
- CSS: ~70% size reduction
- JS: ~60% size reduction

This improves page load performance significantly.