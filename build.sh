#!/bin/bash

# Build script for singwithalon website
# Minifies CSS and JS files

echo "🔧 Starting build process..."
echo ""

# Check if required tools are installed
if ! command -v cssnano &> /dev/null; then
    echo "❌ cssnano not found. Please install with: npm install -g cssnano-cli"
    exit 1
fi

if ! command -v terser &> /dev/null; then
    echo "❌ terser not found. Please install with: npm install -g terser"
    exit 1
fi

# Minify CSS files
echo "📦 Minifying CSS files..."

if [ -f "css/styles.css" ]; then
    cssnano css/styles.css css/styles.min.css
    echo "✅ styles.css → styles.min.css"
else
    echo "⚠️  styles.css not found"
fi

if [ -f "css/video-pages.css" ]; then
    cssnano css/video-pages.css css/video-pages.min.css
    echo "✅ video-pages.css → video-pages.min.css"
else
    echo "⚠️  video-pages.css not found"
fi

# Minify JS files
echo ""
echo "📦 Minifying JavaScript files..."

if [ -f "js/script.js" ]; then
    terser js/script.js -c -m -o js/script.min.js
    echo "✅ script.js → script.min.js"
else
    echo "⚠️  script.js not found"
fi

echo ""
echo "🎉 Build complete!"
echo ""

# Show file size savings
echo "📊 File size comparison:"
if [ -f "css/styles.css" ] && [ -f "css/styles.min.css" ]; then
    original_size=$(wc -c < css/styles.css)
    minified_size=$(wc -c < css/styles.min.css)
    reduction=$(echo "scale=1; (1 - $minified_size/$original_size) * 100" | bc)
    echo "   styles.css: $(numfmt --to=iec $original_size) → $(numfmt --to=iec $minified_size) (${reduction}% reduction)"
fi

if [ -f "js/script.js" ] && [ -f "js/script.min.js" ]; then
    original_size=$(wc -c < js/script.js)
    minified_size=$(wc -c < js/script.min.js)
    reduction=$(echo "scale=1; (1 - $minified_size/$original_size) * 100" | bc)
    echo "   script.js: $(numfmt --to=iec $original_size) → $(numfmt --to=iec $minified_size) (${reduction}% reduction)"
fi

echo ""
echo "💡 Remember: Your HTML already references the minified files!"