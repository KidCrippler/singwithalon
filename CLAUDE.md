# CLAUDE.md


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Professional Hebrew RTL (Right-to-Left) landing page for Alon Cohen, a musician specializing in Israeli music. The site features an interactive song selection system where audiences can choose songs in real-time during performances.

**Tech Stack**: Next.js 15 (App Router) + React 19 + Tailwind CSS + Embla Carousel

**Current State**: Successfully migrated from Vite/React Router to Next.js 15. The `main` branch contains the fully-migrated Next.js application with complete Tailwind CSS refactoring. All legacy code has been removed.

**Historical Note**: Previously used Vite + React Router with GitHub Pages deployment (deprecated November 2024). All legacy branches (`nextjs`, `gh-pages`) have been deleted after successful migration.

## Development Commands

All commands must be run from the `react-app/` directory:

```bash
cd react-app

# Development
npm install --legacy-peer-deps    # Initial setup (required due to React 19)
npm run dev                        # Start Next.js dev server (http://localhost:3001)
npm run build                      # Next.js production build
npm run start                      # Preview production build locally
npm run lint                       # ESLint check
```

**Important**: Use `--legacy-peer-deps` for all npm commands due to React 19 peer dependency warnings.

## Architecture

### Next.js App Router Structure

```
react-app/
├── app/
│   ├── components/           # All React components
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Button.jsx           # ButtonPrimary, ButtonSecondary
│   │   │   └── SectionHeader.jsx    # Reusable section headers
│   │   ├── Navigation.jsx    # Top navbar with hamburger menu
│   │   ├── Hero.jsx         # Hero section with 60 animated particles
│   │   ├── About.jsx        # About section
│   │   ├── VideoGallery.jsx # Video thumbnails grid
│   │   ├── Services.jsx     # Services section
│   │   ├── Testimonials.jsx # Carousel of testimonials (Embla)
│   │   ├── ContactForm.jsx  # WhatsApp-integrated contact form
│   │   ├── Chatbot.jsx      # Floating chat widget
│   │   └── Footer.jsx       # Footer with links
│   ├── data/
│   │   └── videos.js        # Video metadata for gallery
│   ├── utils/
│   │   └── assets.js        # Asset path helpers (deprecated - use Next.js /public directly)
│   ├── video/
│   │   └── [videoId]/       # Dynamic video pages
│   │       └── page.jsx     # Video page component
│   ├── layout.jsx           # Root layout with metadata
│   ├── page.jsx             # Homepage (all sections)
│   └── globals.css          # Global styles + Tailwind utilities + custom CSS
├── public/
│   └── assets/              # Images (WebP/AVIF optimized), videos
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind config with custom animations
└── package.json
```

### Key Architectural Decisions

**CSS Architecture** (Post-Migration):
- **Tailwind CSS**: Primary styling method using utility classes
- **globals.css**: Contains Tailwind imports + custom CSS for complex effects (~416 lines)
- **No legacy CSS**: `styles-original.css` has been fully removed (3,021 lines migrated)
- **Custom CSS in globals.css**:
  - Navigation underline animations
  - Musical note decorations for sections (About, Videos, Services, Contact)
  - Hero particle effects (blur filters, text shadows, accessibility)
  - Embla carousel styles
  - Complex gradients and animations

**Tailwind Configuration Extensions**:
- **Colors**: `primary` (#8b5fbf), `primary-light` (#b19cd9), `primary-dark`
- **Box Shadows**: `musical`, `musical-glow`, `btn-primary`, `btn-primary-hover`, `hero-video`
- **Background Images**: `gradient-primary`
- **Animations**: 14 custom keyframe animations including:
  - `particle-float`, `particle-glow` (Hero particles)
  - `musical-breathe`, `musical-pulse` (Musical elements)
  - `fade-in-up`, `fade-in-down` (Section animations)
- **Important Mode**: Enabled (`important: true`)

**Routing**:
- **Homepage** (`/`): Single-page layout with all sections
- **Video Pages** (`/video/[videoId]/`): Dynamic routes with `generateStaticParams()`
- **Static Generation**: All routes pre-rendered at build time
- **Trailing Slashes**: Enabled for consistent URLs

**Code Organization**:
- All components use `'use client'` directive (interactive features)
- Reusable UI components in `app/components/ui/`
- Video data centralized in `app/data/videos.js`
- Metadata defined in `app/layout.jsx` and video page route

### Performance Optimizations

**Images**:
- Modern formats: AVIF primary, WebP fallback
- `<picture>` elements for responsive images
- Vercel automatic image optimization (when deployed)

**Bundle Optimization**:
- Hero particles: 60 total (18 back + 25 mid + 17 front)
- Mobile optimizations reduce particle count via CSS media queries
- Next.js automatic code splitting
- Tailwind CSS purges unused styles in production

**Font Loading**:
- Google Fonts: Heebo (body) + Secular One (headings)
- Preconnect to Google Fonts in layout.jsx
- `display=swap` to prevent FOIT

**Icons**:
- Font Awesome 6.5.2 via CDN
- Musical symbols: Unicode (♪ ♫ ♬ ● ○)

## RTL (Right-to-Left) Implementation

Critical for Hebrew content:
- `<html lang="he" dir="rtl">` in layout.jsx
- CSS: `direction: rtl` on root elements
- Flexbox/Grid: Automatically reverse for RTL
- Text alignment: Right-aligned by default
- Embla Carousel: Configured with `direction: 'rtl'`

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
- Musical note decorations in section backgrounds

## Critical Components

### Hero.jsx - Animated Particles
- `generateParticles(count, layer)`: Creates floating musical symbols
- **Particle counts**: 18 (back) + 25 (mid) + 17 (front) = 60 total
- **Performance**: Mobile devices show fewer particles via CSS `display: none`
- **Animations**: Custom keyframes in tailwind.config.js + blur/glow effects in globals.css
- **Accessibility**: Respects `prefers-reduced-motion` media query

### Navigation.jsx - RTL Navbar
- Responsive hamburger menu (mobile)
- Active section highlighting on scroll
- Custom underline animation (`.nav-link-underline` in globals.css)
- Scroll effects: backdrop blur + shadow appear on scroll

### ContactForm.jsx - WhatsApp Integration
- Validates Israeli phone numbers (052-XXX-XXXX format)
- Generates WhatsApp message with event details
- Opens `wa.me/{phoneNumber}?text={message}` on submit
- Hebrew validation error messages

### VideoGallery.jsx + Video Pages
- Gallery: Responsive grid of video thumbnails (2x2 on desktop, 1 column mobile)
- Video Pages: Dynamic route `/video/[videoId]/`
- `generateStaticParams()` pre-renders all video pages at build time
- Videos: Cloudflare R2 CDN with poster images (AVIF optimized)

### Testimonials.jsx - Embla Carousel
- Auto-rotating carousel (7s delay)
- RTL support: `direction: 'rtl'` in Embla config
- Manual navigation: prev/next buttons + dot indicators
- Keyboard navigation: Arrow keys (RTL-aware)
- Responsive: 1 card (mobile), 2 cards (tablet), 3 cards (desktop)

### Chatbot.jsx - Important Pattern
**Critical**: Always use conditional Tailwind classes for visibility, never mix with inline styles
```jsx
// ✅ CORRECT - Conditional classes
className={`py-3 px-5 ${isTyping ? 'flex' : 'hidden'}`}

// ❌ WRONG - Mixing Tailwind class with inline style (broken with important: true)
className="py-3 px-5 flex"
style={{ display: isTyping ? 'flex' : 'none' }}
```

## Deployment

### Current Setup (Vercel)

**Production Deployment**:
- Platform: Vercel
- Domain: `singwithalon.com` (custom domain)
- Branch: `main`
- Auto-deploy: Every push to `main` triggers automatic deployment
- Build command: `npm run build`
- Output: Next.js optimized build

**Manual Deployment** (optional):
```bash
cd react-app
vercel --prod  # Deploy directly from local machine without git push
```

**DNS Configuration**:
- Cloudflare DNS points to Vercel
- SSL certificate auto-managed by Vercel

### Build Verification

Before deploying:
```bash
npm run build          # Should complete without errors
npm run start          # Test production build locally
```

## Common Tasks

### Adding New Videos

1. Add video metadata to `app/data/videos.js`
2. Upload video to Cloudflare R2 CDN
3. Add poster image to `public/assets/`
4. Rebuild - Next.js auto-generates static page via `generateStaticParams()`

### Styling Changes

**Tailwind Utilities** (Preferred):
```jsx
<div className="bg-primary text-white p-4 rounded-lg shadow-musical">
```

**Complex Effects** (globals.css):
- Multi-layer gradients
- Complex animations with multiple keyframes
- Blur filters and text shadows
- Musical note decorations

**Important**: When using inline `style` attribute for one CSS property (e.g., `backgroundImage`), include ALL related properties in the same inline object to avoid specificity conflicts:
```jsx
// ✅ CORRECT
<section style={{
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backgroundImage: 'linear-gradient(...)',
  backgroundSize: '20px 60px'
}}>

// ❌ WRONG - Tailwind class won't apply due to inline style specificity
<section className="bg-white/96" style={{
  backgroundImage: 'linear-gradient(...)'
}}>
```

### Performance Tuning

**Reduce Hero Particles**:
Edit `Hero.jsx` lines where `generateParticles()` is called:
```jsx
setParticles({
  back: generateParticles(18, 'back'),   // Reduce from 18
  mid: generateParticles(25, 'mid'),     // Reduce from 25
  front: generateParticles(17, 'front'), // Reduce from 17
});
```

**Mobile Optimizations**:
Particles are automatically reduced on mobile via CSS in `globals.css`:
```css
@media (max-width: 768px) {
  .particle-back:nth-child(n+25),
  .particle-mid:nth-child(n+35),
  .particle-front:nth-child(n+25) {
    display: none;
  }
}
```

### Content Updates

- Edit React components directly in `app/components/`
- All content is in Hebrew - maintain RTL layout
- Contact info: Phone (052-896-2110), Email (contact@singwithalon.com)
- WhatsApp number: 972528962110 (ContactForm.jsx and Chatbot.jsx)

## Troubleshooting

**Build Errors**:
- `npm install --legacy-peer-deps` - Always use this flag with React 19
- Missing dependencies - Check package.json and reinstall
- Port conflicts - Next.js uses port 3001 (configurable in package.json)

**Styling Issues**:
- Tailwind classes not applying - Check `important: true` config
- Inline styles override Tailwind - Move all related properties to inline object
- Animations not working - Verify keyframes in tailwind.config.js

**Deployment Issues**:
- Vercel build fails - Check build logs, ensure all deps in package.json
- 404 on routes - Verify `trailingSlash: true` in next.config.js
- Assets not loading - Check paths start with `/assets/` not relative

## Migration Status

**Migration Complete** ✅ (November 2024):
- Next.js 15 setup with App Router
- All 12 components migrated to Next.js
- Complete Tailwind CSS refactoring (100%)
- Legacy CSS removed (3,021 lines deleted)
- Legacy Vite code removed (src/, vite.config.js, scripts/)
- Vercel deployment live at singwithalon.com
- DNS configured (Cloudflare → Vercel)
- All branches cleaned up (gh-pages, nextjs deleted)
- RTL layout verified
- All animations preserved

See `MIGRATION_PLAN.md` for detailed migration history and technical decisions.
