#!/bin/bash

# Build script for singwithalon website
# Minifies CSS and JS files and ensures HTML files reference minified versions

echo "🔧 Starting build process..."
echo ""

# Check if required tools are installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

# Check for cssnano availability
if ! npx cssnano --version &> /dev/null; then
    echo "❌ cssnano not available. Installing locally..."
    npm install cssnano-cli --save-dev
fi

# Check for terser availability
if ! npx terser --version &> /dev/null; then
    echo "❌ terser not available. Installing locally..."
    npm install terser --save-dev
fi

# Minify CSS files
echo "📦 Minifying CSS files..."

if [ -f "css/styles.css" ]; then
    npx cssnano css/styles.css css/styles.min.css --no-map
    if [ $? -eq 0 ]; then
        echo "✅ styles.css → styles.min.css"
    else
        echo "❌ Failed to minify styles.css"
        exit 1
    fi
else
    echo "⚠️  styles.css not found"
fi

if [ -f "css/video-pages.css" ]; then
    npx cssnano css/video-pages.css css/video-pages.min.css --no-map
    if [ $? -eq 0 ]; then
        echo "✅ video-pages.css → video-pages.min.css"
    else
        echo "❌ Failed to minify video-pages.css"
        exit 1
    fi
else
    echo "⚠️  video-pages.css not found"
fi

# Minify JS files
echo ""
echo "📦 Minifying JavaScript files..."

if [ -f "js/script.js" ]; then
    npx terser js/script.js --compress --mangle --output js/script.min.js
    if [ $? -eq 0 ]; then
        echo "✅ script.js → script.min.js"
    else
        echo "❌ Failed to minify script.js"
        exit 1
    fi
else
    echo "⚠️  script.js not found"
fi

# Update HTML files to reference minified versions
echo ""
echo "🔄 Updating HTML files to reference minified versions..."

# Update index.html to reference minified files
if [ -f "index.html" ]; then
    # Create backup
    cp index.html index.html.backup

    # Replace CSS references
    sed -i.tmp 's|css/styles\.css|css/styles.min.css|g' index.html

    # Replace JS references
    sed -i.tmp 's|js/script\.js|js/script.min.js|g' index.html

    # Clean up temporary files
    rm -f index.html.tmp

    echo "✅ Updated index.html references"
else
    echo "⚠️  index.html not found"
fi

# Update video pages to reference minified CSS (they should already be correct)
video_files_updated=0
for video_file in video/*.html; do
    if [ -f "$video_file" ]; then
        # Create backup
        cp "$video_file" "${video_file}.backup"

        # Ensure video pages reference minified CSS
        sed -i.tmp 's|css/video-pages\.css|css/video-pages.min.css|g' "$video_file"

        # Clean up temporary files
        rm -f "${video_file}.tmp"

        video_files_updated=$((video_files_updated + 1))
    fi
done

if [ $video_files_updated -gt 0 ]; then
    echo "✅ Updated $video_files_updated video page(s) references"
fi

echo ""
echo "🎉 Build complete!"
echo ""

# Show file size savings
echo "📊 File size comparison:"

if [ -f "css/styles.css" ] && [ -f "css/styles.min.css" ]; then
    original_size=$(wc -c < css/styles.css)
    minified_size=$(wc -c < css/styles.min.css)
    if command -v bc &> /dev/null && command -v numfmt &> /dev/null; then
        reduction=$(echo "scale=1; (1 - $minified_size/$original_size) * 100" | bc)
        echo "   styles.css: $(numfmt --to=iec $original_size) → $(numfmt --to=iec $minified_size) (${reduction}% reduction)"
    else
        echo "   styles.css: $original_size bytes → $minified_size bytes"
    fi
fi

if [ -f "css/video-pages.css" ] && [ -f "css/video-pages.min.css" ]; then
    original_size=$(wc -c < css/video-pages.css)
    minified_size=$(wc -c < css/video-pages.min.css)
    if command -v bc &> /dev/null && command -v numfmt &> /dev/null; then
        reduction=$(echo "scale=1; (1 - $minified_size/$original_size) * 100" | bc)
        echo "   video-pages.css: $(numfmt --to=iec $original_size) → $(numfmt --to=iec $minified_size) (${reduction}% reduction)"
    else
        echo "   video-pages.css: $original_size bytes → $minified_size bytes"
    fi
fi

if [ -f "js/script.js" ] && [ -f "js/script.min.js" ]; then
    original_size=$(wc -c < js/script.js)
    minified_size=$(wc -c < js/script.min.js)
    if command -v bc &> /dev/null && command -v numfmt &> /dev/null; then
        reduction=$(echo "scale=1; (1 - $minified_size/$original_size) * 100" | bc)
        echo "   script.js: $(numfmt --to=iec $original_size) → $(numfmt --to=iec $minified_size) (${reduction}% reduction)"
    else
        echo "   script.js: $original_size bytes → $minified_size bytes"
    fi
fi

echo ""
echo "✅ HTML files now reference minified versions"
echo "💡 Backup files (.backup) created for safety"
echo ""
echo "🚀 Website is now optimized and ready for deployment!"