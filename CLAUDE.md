# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Professional Hebrew RTL (Right-to-Left) React landing page for Alon Cohen, a musician specializing in Israeli music. The site features an interactive song selection system where audiences can choose songs in real-time during performances.

**Tech Stack**: React 19 + Vite 7 + React Router + Tailwind CSS (utilities only) + Custom CSS

**Important**: This project was migrated from vanilla HTML/CSS/JS to React while maintaining pixel-perfect design consistency through `styles-original.css`.

## Development Commands

All commands must be run from the `react-app/` directory:

```bash
cd react-app

# Development
npm install --legacy-peer-deps    # Initial setup (required due to React 19)
npm run dev                        # Start dev server (http://localhost:5173)

# Building
npm run build                      # Vite build + automatic prerendering with Puppeteer
npm run preview                    # Preview production build locally

# Linting
npm run lint                       # ESLint check

# Deployment
npm run deploy                     # Build + deploy to GitHub Pages (gh-pages branch)
```

**Build Process**: `npm run build` does two things:
1. Vite builds optimized bundles to `dist/`
2. Puppeteer prerenderer (`scripts/prerender.js`) crawls all routes and generates SEO-ready static HTML

## Architecture

### React Application Structure

```
react-app/
├── src/
│   ├── components/           # React components (all site sections)
│   │   ├── Navigation.jsx    # Top navbar with hamburger menu
│   │   ├── Hero.jsx         # Hero section with animated particles
│   │   ├── About.jsx        # About section
│   │   ├── VideoGallery.jsx # Video thumbnails grid
│   │   ├── VideoPage.jsx    # Individual video pages (lazy-loaded)
│   │   ├── Services.jsx     # Services section
│   │   ├── Testimonials.jsx # Carousel of testimonials (Embla)
│   │   ├── ContactForm.jsx  # WhatsApp-integrated contact form
│   │   ├── Chatbot.jsx      # Floating chat widget
│   │   └── Footer.jsx       # Footer with links
│   ├── utils/
│   │   └── assets.js        # getAssetPath() helper for BASE_URL
│   ├── App.jsx              # Main router (HomePage + VideoPage routes)
│   ├── main.jsx             # React entry point
│   ├── index.css            # Imports styles-original.css + Tailwind utilities
│   └── styles-original.css  # Complete CSS from vanilla version (~2000 lines)
├── public/
│   ├── assets/              # Images (WebP/AVIF optimized)
│   ├── CNAME               # Domain: singwithalon.com
│   ├── robots.txt          # SEO
│   └── sitemap.xml         # SEO
├── scripts/
│   └── prerender.js        # Puppeteer script for SSG
├── vite.config.js          # Vite config with code splitting + compression
├── tailwind.config.js      # Tailwind utilities only
└── package.json
```

### Key Architectural Decisions

**Hybrid CSS Approach**:
- `styles-original.css`: Contains ALL styling from the original vanilla site (imported first)
- `index.css`: Imports original styles, then adds Tailwind **utilities only** (no base/reset)
- Reason: Maintains pixel-perfect design while allowing Tailwind utility classes for tweaks

**Routing**:
- **HomePage**: Single-page layout with all sections (Hero, About, Videos, Services, Testimonials, Contact, Footer)
- **VideoPage**: Lazy-loaded with React.lazy() for code splitting (reduces initial bundle)
- Routes: `/` (home), `/video/:videoId` (individual video pages)

**Code Splitting** (vite.config.js):
- `vendor-react`: React core (~11KB gzipped)
- `vendor-carousel`: Embla Carousel (~8KB gzipped)
- `vendor-router`: React Router + Helmet (~17KB gzipped)
- `VideoPage`: Lazy-loaded chunk (~6KB gzipped)

**Prerendering**:
- `scripts/prerender.js` runs after Vite build
- Launches Puppeteer headless browser on port 3000
- Crawls all routes: `/`, `/video/tadmit`, `/video/rony`, `/video/jam-toren`, `/video/borot`, `/video/kvar-avar`
- Extracts fully-rendered HTML and saves to dist/
- Creates `404.html` for SPA fallback routing

### Performance Optimizations

**Images**:
- Modern formats: AVIF primary, WebP fallback
- `<picture>` elements in Navigation, Hero, About, Footer
- Logo optimized from 318KB to 37KB (89% reduction)
- Helper: `getAssetPath()` for correct BASE_URL handling

**Bundle Optimization**:
- Hero particles reduced to 60 (from original 120) for faster FCP/TTI
- Manual code splitting (see vite.config.js)
- Console logs dropped in production (esbuild)
- Gzip + Brotli compression enabled

**Font Loading**:
- Google Fonts: Heebo (body) + Secular One (headings)
- `display=swap` to prevent FOIT (Flash of Invisible Text)
- Preloaded in index.html

**Icons**:
- Font Awesome 6.5.2 via CDN (async loaded)
- React-icons available but not used (caused hydration issues)

## RTL (Right-to-Left) Implementation

Critical for Hebrew content:
- HTML: `<html lang="he" dir="rtl">`
- CSS: `direction: rtl` on root
- Flexbox/Grid: Automatically reverse for RTL
- Text alignment: Right-aligned by default

**When modifying layouts**: Always test RTL behavior - flex direction, text alignment, and margins/padding will flip.

## Design System

**Color Palette**:
- Primary: Purple gradient `#8b5fbf` to `#b19cd9`
- Used throughout: buttons, links, accents, navbar

**Typography**:
- Headings: Secular One (musical personality)
- Body: Heebo (excellent Hebrew support)

**Musical Elements**:
- Unicode symbols: ♪ ♫ ♬ ● ○
- Animated particles in Hero section (60 particles across 3 layers)
- Font Awesome icons for UI elements

## Critical Components

### Hero.jsx - Animated Particles
- `generateParticles(count, layer)`: Creates floating musical symbols
- **Current config**: 18 (back) + 25 (mid) + 17 (front) = 60 total particles
- **Performance impact**: Directly affects FCP/TTI - reduce count for better performance
- CSS animations defined in styles-original.css

### Navigation.jsx - RTL Navbar
- Responsive hamburger menu (mobile)
- Active section highlighting on scroll
- Auto-closes on outside clicks
- Logo uses AVIF/WebP `<picture>` element

### ContactForm.jsx - WhatsApp Integration
- Validates Israeli phone numbers (052-XXX-XXXX format)
- Generates WhatsApp message with event details
- Opens `wa.me` API link on submit
- Hebrew validation error messages

### VideoGallery.jsx + VideoPage.jsx
- Gallery: Grid of video thumbnails
- VideoPage: Full video player (lazy-loaded route)
- Videos hosted on Cloudflare R2 CDN
- Poster images optimized with AVIF

### Testimonials.jsx - Embla Carousel
- Auto-rotating testimonials carousel
- Manual navigation (prev/next buttons + dots)
- Embla Carousel React + Autoplay plugin

## Deployment

**GitHub Pages Setup**:
1. Custom domain: `singwithalon.com` (via CNAME file)
2. DNS (Cloudflare): A records to GitHub IPs + CNAME for www
3. Deploy branch: `gh-pages`
4. Deploy command: `npm run deploy` (builds + pushes to gh-pages)

**Build Output**:
- `dist/index.html`: Prerendered homepage (~63KB)
- `dist/video/*/index.html`: Prerendered video pages (~27KB each)
- `dist/assets/`: JS/CSS bundles + images
- `dist/404.html`: SPA fallback for client-side routing

## Common Tasks

**Content Updates**:
- Edit React components directly (e.g., `Hero.jsx`, `About.jsx`)
- All content is in Hebrew - maintain RTL layout
- Update contact info: Phone (052-896-2110), Email (contact@singwithalon.com)

**Adding New Videos**:
1. Add video metadata to VideoGallery.jsx
2. Add route to `scripts/prerender.js` ROUTES array
3. Rebuild to generate prerendered video page

**Performance Tuning**:
- Reduce Hero particles: Edit `generateParticles()` calls in Hero.jsx (lines 74, 79, 84)
- Image optimization: Use AVIF with WebP fallback via `<picture>` element
- Code splitting: Add new routes to `vite.config.js` manualChunks

**Styling Changes**:
- Modify `styles-original.css` for global styles (matches original design)
- Use Tailwind utilities for quick tweaks (avoid overriding base styles)
- Maintain purple color palette (#8b5fbf, #b19cd9)
- Test RTL layout after any flexbox/grid changes

**Troubleshooting Build Errors**:
- `EADDRINUSE port 3000`: Kill processes on port 3000 (`lsof -ti:3000 | xargs kill -9`)
- Icon rendering issues: Font Awesome via CDN is stable; avoid react-icons (hydration mismatch)
- Asset path issues: Always use `getAssetPath()` helper from `utils/assets.js`

## Important Notes

- **Legacy peer deps**: Use `--legacy-peer-deps` for npm install (React 19 compatibility)
- **No .cursorrules relevance**: .cursor-rules file describes old vanilla JS minification process (not applicable to Vite build)
- **Prerendering port**: Scripts use port 3000 - ensure it's free before building
- **BASE_URL handling**: Use `import.meta.env.BASE_URL` via getAssetPath() for GitHub Pages compatibility
- **Browser targets**: Modern browsers only (ES6+, CSS Grid, Intersection Observer)
