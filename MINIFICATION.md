# Minification Instructions

This document explains the automated build process that minifies CSS and JavaScript files and ensures HTML files reference the optimized versions.

## Current Setup

The website uses minified versions of CSS and JavaScript files for better performance:
- `css/styles.min.css` (minified from `css/styles.css`)
- `css/video-pages.min.css` (minified from `css/video-pages.css`)
- `js/script.min.js` (minified from `js/script.js`)

## Automated Build Process

The `build.sh` script handles everything automatically:

### What the Build Script Does

1. **Dependency Management**: Automatically installs required tools if needed
2. **CSS Minification**: Minifies all CSS files with error handling
3. **JavaScript Minification**: Minifies all JS files with compression and mangling
4. **HTML Updates**: Updates all HTML files to reference minified versions
5. **Backup Creation**: Creates `.backup` files for safety
6. **Progress Reporting**: Shows file size reductions and completion status

### Files Processed

**CSS Files:**
- `css/styles.css` → `css/styles.min.css`
- `css/video-pages.css` → `css/video-pages.min.css`

**JavaScript Files:**
- `js/script.js` → `js/script.min.js`

**HTML Files Updated:**
- `index.html` (references styles.css → styles.min.css, script.js → script.min.js)
- All `video/*.html` files (references video-pages.css → video-pages.min.css)

## Usage

### After Making Changes to Source Files

Simply run the build script:
```bash
./build.sh
```

The script will:
- ✅ Minify all CSS and JavaScript files
- ✅ Update HTML references to point to minified versions
- ✅ Create backup files (.backup) for safety
- ✅ Show file size savings
- ✅ Verify no errors occurred

### Manual Commands (Not Recommended)

If you need to run commands manually:
```bash
# Minify CSS files
npx cssnano css/styles.css css/styles.min.css --no-map
npx cssnano css/video-pages.css css/video-pages.min.css --no-map

# Minify JS files
npx terser js/script.js --compress --mangle --output js/script.min.js

# Update HTML references (manual sed commands - complex)
# Use build.sh instead for this step
```

## Requirements

- **Node.js**: Required for npx
- **Dependencies**: Automatically installed by build script if needed
  - `cssnano-cli` (for CSS minification)
  - `terser` (for JavaScript minification)

## Important Notes

### Safety Features
- **Backup Files**: `.backup` files are created before any changes
- **Error Handling**: Build stops if any minification fails
- **Atomic Operations**: HTML updates only happen after successful minification

### Best Practices
- **Always run `./build.sh`** after editing source files (CSS/JS)
- **Never edit minified files directly** - they will be overwritten
- **Test the website** after running the build process
- **Commit both source and minified files** to version control

### File Size Benefits

Current minification provides significant size reduction:
- **styles.css**: ~40% size reduction (63K → 40K)
- **video-pages.css**: ~40% size reduction (3.6K → 2.5K)
- **script.js**: ~50% size reduction (47K → 24K)

This improves page load performance significantly, especially on slower connections.

## Troubleshooting

### Build Script Fails
- Check that Node.js is installed: `node --version`
- Ensure you have write permissions in the project directory
- Check for CSS syntax errors that prevent minification

### HTML Not Updated
- The build script automatically handles HTML updates
- Backup files (.backup) are created for safety
- Original source files remain unchanged

### Performance Issues
- Minified files should always be smaller than originals
- Use browser dev tools to verify minified files are loading
- Check network tab to confirm file sizes match expected reductions