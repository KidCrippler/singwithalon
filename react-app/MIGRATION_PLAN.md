# Next.js Migration Plan: Vite → Next.js 15 + Vercel

**Project**: singwithalon.com
**Current**: Vite + React SPA with custom Puppeteer SSG
**Target**: Next.js 15 App Router with Vercel deployment
**Strategy**: Incremental migration with testing at each phase

## Migration Status

- ✅ **Phase 1**: Next.js Setup (side-by-side with Vite) - COMPLETE
- ✅ **Phase 2**: Homepage Component Migration - COMPLETE
- ✅ **Phase 3**: Video Pages Migration - COMPLETE
- ✅ **Phase 3.5**: Deploy to Vercel (Full Features) - COMPLETE
- 🔄 **Phase 4**: CSS Refactoring (Legacy → Pure Tailwind) - IN PROGRESS
  - ⏳ Phase 4A: CSS Audit & Planning
  - ⏳ Phase 4B: Incremental Refactoring
  - ⏳ Phase 4C: Finalization
- ⏳ **Phase 5-9**: Remaining phases

**Last Updated**: 2025-11-15
**Deployment**: Live on Vercel (nextjs branch)

---

## Overview

This migration will transition the Hebrew RTL landing page from Vite to Next.js while:
- ✅ Maintaining all functionality and appearance
- ✅ Improving SEO (native SSG instead of Puppeteer)
- ✅ Refactoring CSS from 64KB legacy + Tailwind → Pure Tailwind
- ✅ Deploying to Vercel with full platform optimizations
- ✅ Testing extensively at each phase to prevent regressions

---

## Current Architecture Analysis

**Build System**: Vite 7.1.7 + custom Puppeteer prerendering
**Framework**: React 19 + React Router
**Styling**: 64KB vanilla CSS (`styles-original.css`) + Tailwind utilities
**Pages**: 6 routes (1 homepage + 5 video pages)
**Deployment**: GitHub Pages
**Images**: Manual WebP/AVIF optimization

**Routes**:
- `/` - Homepage (one-page landing with all sections)
- `/video/tadmit` - תדמית
- `/video/rony` - רוני - גזוז
- `/video/jam-toren` - ג'מגוג'ם עם דן תורן ז"ל
- `/video/borot` - אל בורות המים - נעמי שמר
- `/video/kvar-avar` - כבר עבר - שלמה ארצי

---

## Phase 1: Next.js Setup (Side-by-side with Vite)

**Goal**: Get Next.js running without breaking Vite

### Tasks

1. **Install Next.js 15**:
   ```bash
   npm install next@latest react@latest react-dom@latest
   ```

2. **Create Next.js directory structure**:
   ```
   /app
   ├── layout.jsx
   └── page.jsx
   ```

3. **Create `next.config.js`** (static export mode initially):
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export', // Static export for GitHub Pages compatibility
     images: {
       unoptimized: true, // Required for static export
     },
     trailingSlash: true, // Better for static hosting
   }

   module.exports = nextConfig
   ```

4. **Update `package.json` scripts** (keep Vite scripts):
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build && node scripts/prerender.js",
       "next-dev": "next dev -p 3001",
       "next-build": "next build"
     }
   }
   ```

5. **Create minimal `app/layout.jsx`**:
   ```jsx
   export const metadata = {
     title: 'Alon Cohen - Israeli Music',
   }

   export default function RootLayout({ children }) {
     return (
       <html lang="he" dir="rtl">
         <body>{children}</body>
       </html>
     )
   }
   ```

6. **Create minimal `app/page.jsx`**:
   ```jsx
   export default function Home() {
     return <div>Hello Next.js</div>
   }
   ```

### Testing Checkpoint ✓

- [ ] Run `npm run dev` → Vite works on `localhost:5173`
- [ ] Run `npm run next-dev` → Next.js works on `localhost:3001`
- [ ] Run `npm run build` → Vite build succeeds, creates `dist/`
- [ ] Run `npm run next-build` → Next.js build succeeds, creates `out/`
- [ ] Verify `out/` contains `index.html`

**Success Criteria**: Both systems run independently without conflicts

---

## Phase 2: Homepage Component Migration

**Goal**: Replicate homepage pixel-perfect in Next.js

### Tasks

1. **Create component directory**:
   ```bash
   mkdir -p app/components
   ```

2. **Copy all components** from `src/components/` to `app/components/`:
   - Navigation.jsx
   - Hero.jsx
   - About.jsx
   - VideoGallery.jsx
   - Services.jsx
   - Testimonials.jsx
   - ContactForm.jsx
   - Footer.jsx
   - Chatbot.jsx

3. **Create comprehensive `app/layout.jsx`**:
   ```jsx
   import './globals.css'

   export const metadata = {
     title: 'אלון כהן - מוזיקה ישראלית מקורית',
     description: 'אלון כהן - מוזיקאי ומבצע ישראלי מקצועי...',
     keywords: 'אלון כהן, מוזיקה ישראלית, זמר, ...',
   }

   export default function RootLayout({ children }) {
     return (
       <html lang="he" dir="rtl">
         <head>
           <link
             rel="stylesheet"
             href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
           />
           <link
             href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&family=Secular+One&display=swap"
             rel="stylesheet"
           />
         </head>
         <body>{children}</body>
       </html>
     )
   }
   ```

4. **Create `app/globals.css`**:
   ```css
   @import '../src/styles-original.css'; /* Temporarily import old CSS */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. **Create `app/page.jsx`** (homepage):
   ```jsx
   import Navigation from './components/Navigation'
   import Hero from './components/Hero'
   import About from './components/About'
   import VideoGallery from './components/VideoGallery'
   import Services from './components/Services'
   import Testimonials from './components/Testimonials'
   import ContactForm from './components/ContactForm'
   import Footer from './components/Footer'
   import Chatbot from './components/Chatbot'

   export default function Home() {
     return (
       <>
         <Navigation />
         <Hero />
         <About />
         <VideoGallery />
         <Services />
         <Testimonials />
         <ContactForm />
         <Footer />
         <Chatbot />
       </>
     )
   }
   ```

6. **Update all components**:
   - Replace `react-router-dom` `<Link>` with Next.js `<Link>` from `'next/link'`
   - Remove React Helmet usage (will use Metadata API)
   - Remove `BrowserRouter`, `Routes`, `Route` imports
   - Update `href` paths (remove hash routing if any)
   - Keep all component logic unchanged

7. **Update `src/data/videos.js`** references in components

8. **Copy `tailwind.config.js` settings** (already compatible)

### Testing Checkpoint ✓

- [ ] Run both servers: `npm run dev` (Vite) and `npm run next-dev` (Next.js)
- [ ] Open both in browsers side-by-side
- [ ] **Visual comparison**:
  - [ ] Navigation menu (desktop + mobile hamburger)
  - [ ] Hero section (background, text, animations)
  - [ ] About section
  - [ ] Video gallery (grid layout, hover effects)
  - [ ] Services section
  - [ ] Testimonials
  - [ ] Contact form
  - [ ] Footer
  - [ ] Chatbot
- [ ] **Functional testing**:
  - [ ] Mobile menu opens/closes
  - [ ] All navigation links work
  - [ ] Video gallery interactions
  - [ ] Contact form validation
  - [ ] WhatsApp integration
  - [ ] Chatbot interactions
- [ ] **Responsive testing**:
  - [ ] Mobile (< 768px)
  - [ ] Tablet (768px - 1024px)
  - [ ] Desktop (> 1024px)
- [ ] **RTL verification**:
  - [ ] Hebrew text displays correctly
  - [ ] Layout flows right-to-left
  - [ ] Flexbox/Grid items align correctly

**Success Criteria**: Next.js homepage looks and behaves identically to Vite version

---

## Phase 3: Video Pages Migration

**Goal**: Replicate all 5 video pages with proper SSG

### Tasks

1. **Create dynamic route structure**:
   ```bash
   mkdir -p app/video/[videoId]
   ```

2. **Copy VideoPage component** to `app/components/VideoPage.jsx`

3. **Copy video data**: Ensure `src/data/videos.js` is accessible

4. **Create `app/video/[videoId]/page.jsx`**:
   ```jsx
   import { notFound } from 'next/navigation'
   import VideoPage from '@/app/components/VideoPage'
   import videosData from '@/src/data/videos'

   // Generate static params for all video IDs
   export async function generateStaticParams() {
     return videosData.map((video) => ({
       videoId: video.id,
     }))
   }

   // Generate metadata for each video page
   export async function generateMetadata({ params }) {
     const video = videosData.find(v => v.id === params.videoId)

     if (!video) return {}

     return {
       title: `${video.title} - אלון כהן`,
       description: video.description,
       keywords: video.keywords,
       openGraph: {
         title: video.title,
         description: video.description,
         images: [video.poster],
         type: 'video.other',
       },
       twitter: {
         card: 'summary_large_image',
         title: video.title,
         description: video.description,
         images: [video.poster],
       },
     }
   }

   export default function VideoPageRoute({ params }) {
     const video = videosData.find(v => v.id === params.videoId)

     if (!video) {
       notFound()
     }

     return <VideoPage video={video} />
   }
   ```

5. **Add structured data** to VideoPage component:
   ```jsx
   // In VideoPage component
   const structuredData = {
     "@context": "https://schema.org",
     "@type": "VideoObject",
     "name": video.title,
     "description": video.description,
     "thumbnailUrl": video.poster,
     "uploadDate": video.uploadDate || "2024-01-01",
     "contentUrl": video.src,
   }

   return (
     <>
       <script
         type="application/ld+json"
         dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
       />
       {/* Rest of component */}
     </>
   )
   ```

6. **Update VideoPage component**:
   - Remove React Helmet
   - Remove React Router links → use Next.js Link
   - Keep all video player logic

### Testing Checkpoint ✓

- [ ] Test all 6 routes in both systems:
  - Vite: `localhost:5173`, `localhost:5173/video/tadmit`, etc.
  - Next.js: `localhost:3001`, `localhost:3001/video/tadmit`, etc.
- [ ] **Visual comparison** for each video page:
  - [ ] `/video/tadmit`
  - [ ] `/video/rony`
  - [ ] `/video/jam-toren`
  - [ ] `/video/borot`
  - [ ] `/video/kvar-avar`
- [ ] **Functional testing**:
  - [ ] Video player works
  - [ ] Back to gallery link works
  - [ ] Navigation works
- [ ] **SEO comparison** (view source):
  - [ ] Meta title correct
  - [ ] Meta description correct
  - [ ] Open Graph tags present
  - [ ] Twitter Card tags present
  - [ ] Structured data (JSON-LD) present
- [ ] **Static build test**:
  - [ ] Run `npm run next-build`
  - [ ] Verify `out/` contains:
    - `index.html`
    - `video/tadmit/index.html`
    - `video/rony/index.html`
    - `video/jam-toren/index.html`
    - `video/borot/index.html`
    - `video/kvar-avar/index.html`

**Success Criteria**: All pages render identically, SEO metadata matches or improves

---

## Phase 3.5: Deploy to Vercel (Static Export Mode)

**Goal**: Get Vercel deployment working early for parallel testing

### Tasks

1. **Create Vercel account** (if not already): https://vercel.com

2. **Connect GitHub repository**:
   - Go to Vercel dashboard
   - Click "Add New Project"
   - Import from GitHub: `singwithalon/react-app` (or your repo)

3. **Configure Vercel project**:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (or specify if in subdirectory)
   - Build Command: `npm run next-build` (or leave default `next build`)
   - Output Directory: Leave default (Vercel knows to use `out/` for static export)

4. **Set up environment variables** (if any needed):
   - None required for static site

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Get preview URL (e.g., `your-project.vercel.app`)

6. **Set up custom domain** (optional, can wait):
   - In Vercel project settings → Domains
   - Add `singwithalon.com`
   - Configure DNS later (keep GitHub Pages for now)

7. **Enable preview deployments**:
   - Automatic for all branches/PRs
   - Great for testing before merging

8. **Keep GitHub Pages deployment** working as backup

### Testing Checkpoint ✓

- [ ] Vercel deployment succeeds (check build logs)
- [ ] Test Vercel preview URL: `your-project.vercel.app`
- [ ] **Compare all three versions**:
  - GitHub Pages (Vite): Current production
  - Local Next.js: `localhost:3001`
  - Vercel (Next.js): Preview URL
- [ ] Verify all 6 routes work on Vercel:
  - [ ] `/`
  - [ ] `/video/tadmit`
  - [ ] `/video/rony`
  - [ ] `/video/jam-toren`
  - [ ] `/video/borot`
  - [ ] `/video/kvar-avar`
- [ ] **Performance test on Vercel**:
  - [ ] Run Lighthouse audit
  - [ ] Check load times
  - [ ] Test from different locations (if possible)
- [ ] **Functional test on Vercel**:
  - [ ] All interactions work
  - [ ] Forms submit correctly
  - [ ] WhatsApp integration works

**Success Criteria**: Dual deployment working (GitHub Pages + Vercel)

**Note**: At this point you have 3 working versions:
- Vite (local + GitHub Pages production)
- Next.js static export (local + Vercel preview)

---

## Phase 4A: CSS Audit & Planning

**Goal**: Create a comprehensive strategy for CSS refactoring

### Tasks

1. **Analyze `src/styles-original.css` structure** (~64KB, ~1,700 lines):
   - Root variables (CSS custom properties)
   - CSS reset and base styles
   - Typography (headings, paragraphs, links)
   - Layout utilities (containers, sections, spacing)
   - Navigation component styles
   - Hero section styles (gradients, animations, shadows)
   - About section styles
   - VideoGallery section styles
   - Services section styles
   - Testimonials section styles
   - ContactForm section styles
   - Footer section styles
   - Chatbot styles
   - Musical animations and effects
   - Responsive media queries

2. **Create CSS conversion mapping document**:
   - List every CSS class and its purpose
   - Identify Tailwind utility equivalents
   - Flag complex patterns that need custom CSS
   - Document animations that need `@keyframes`
   - Identify duplicate styles

3. **Plan Tailwind config extensions**:
   - **Colors**: Purple palette (#8b5fbf, #b19cd9, gradients)
   - **Fonts**: Heebo (body), Secular One (headings)
   - **Shadows**: `musical-glow`, `musical` custom shadows
   - **Animations**:
     - `breathing` - subtle scale animation for hero text
     - `float` - floating musical notes
     - `fadeInUp` - scroll animations
   - **Breakpoints**: Verify defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

4. **Determine conversion order** (component by component):
   1. Root variables & global styles
   2. Navigation
   3. Hero section (most complex - gradients, animations)
   4. About section
   5. VideoGallery section
   6. Services section
   7. Testimonials section
   8. ContactForm section
   9. Footer section
   10. Chatbot
   11. VideoPage component
   12. Musical effects and animations

5. **Document custom CSS to preserve** in `globals.css`:
   - Complex animations (@keyframes)
   - Multi-layer text shadows
   - Advanced gradient backgrounds
   - Pseudo-element musical symbols
   - Any patterns not easily expressible in Tailwind

6. **Create conversion checklist** for each component:
   - [ ] Replace layout classes (display, flexbox, grid)
   - [ ] Replace spacing classes (margin, padding)
   - [ ] Replace colors (text, background, borders)
   - [ ] Replace typography (font, size, weight, line-height)
   - [ ] Replace responsive classes
   - [ ] Test mobile, tablet, desktop
   - [ ] Test RTL layout
   - [ ] Test interactions (hover, focus, active)

### Testing Checkpoint ✓

- [ ] Review mapping document completeness
- [ ] Verify all CSS patterns accounted for
- [ ] Confirm conversion order makes sense
- [ ] Review with stakeholder (if applicable)

**Success Criteria**: Complete and detailed refactoring roadmap

**Deliverables**:
- CSS conversion mapping document
- Tailwind config plan
- Component conversion checklist
- Timeline estimate

---

## Phase 4B: CSS Refactoring (Incremental, Component by Component)

**Goal**: Convert CSS section by section with testing after each

### Process for Each Component

**Before starting**:
1. Take screenshots of component (all breakpoints)
2. Document current classes used
3. Plan Tailwind replacement

**During conversion**:
1. Add Tailwind classes to JSX
2. Remove old CSS class references
3. Test immediately (don't move to next component)

**After completion**:
1. Visual comparison (before/after screenshots)
2. Functional testing
3. RTL verification
4. Responsive testing

### Conversion Tasks

#### 1. Root Variables & Global Styles

Update `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8b5fbf',
          light: '#b19cd9',
          dark: '#6b4a9f',
        },
        accent: {
          DEFAULT: '#b19cd9',
          light: '#d4c5e8',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
        heading: ['Secular One', 'cursive'],
      },
      boxShadow: {
        'musical-glow': '0 0 20px rgba(139, 95, 191, 0.3), 0 0 40px rgba(139, 95, 191, 0.2)',
        'musical': '0 4px 6px rgba(139, 95, 191, 0.1)',
      },
      animation: {
        'breathing': 'breathing 4s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'fadeInUp': 'fadeInUp 0.6s ease-out',
      },
      keyframes: {
        breathing: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

Create `app/globals.css` with custom animations:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Musical note symbols */
.musical-note::before {
  content: '♪';
  /* ... */
}

/* Complex gradients not easily done in Tailwind */
.hero-gradient {
  background: linear-gradient(135deg, #8b5fbf 0%, #b19cd9 100%);
}

/* Custom pseudo-element styles */
/* ... */
```

**Testing**: Verify colors, fonts load correctly

#### 2. Navigation Component

Example conversion:
```jsx
// Before (with old CSS classes):
<nav className="navbar">
  <div className="nav-container">
    <a href="/" className="nav-logo">אלון כהן</a>
  </div>
</nav>

// After (with Tailwind):
<nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-md z-50">
  <div className="container mx-auto px-4 py-4 flex justify-between items-center">
    <Link href="/" className="text-2xl font-heading text-primary font-bold">
      אלון כהן
    </Link>
  </div>
</nav>
```

**Testing Checkpoint ✓**:
- [ ] Navigation bar appears correctly
- [ ] Logo and links visible
- [ ] Mobile menu works (hamburger, open/close)
- [ ] Sticky behavior works
- [ ] RTL layout correct
- [ ] Responsive (mobile, tablet, desktop)

#### 3. Hero Section

This is the most complex section with:
- Gradient backgrounds
- Multi-layer text shadows
- Breathing animations
- Musical symbols
- Video background

Example:
```jsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  {/* Background video */}
  <video className="absolute inset-0 w-full h-full object-cover" />

  {/* Overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/60" />

  {/* Content */}
  <div className="relative z-10 text-center px-4">
    <h1 className="text-5xl md:text-7xl font-heading text-white animate-breathing shadow-musical-glow">
      אלון כהן
    </h1>
    <p className="text-xl md:text-2xl text-white/90 mt-4">
      מוזיקה ישראלית מקורית
    </p>
  </div>
</section>
```

**Testing Checkpoint ✓**:
- [ ] Hero section full viewport height
- [ ] Background video plays
- [ ] Text visible and readable
- [ ] Animations work (breathing effect)
- [ ] Shadows render correctly
- [ ] Responsive text sizing
- [ ] RTL text alignment

#### 4-11. Remaining Components

Follow same pattern for:
- About section
- VideoGallery section
- Services section
- Testimonials section
- ContactForm section
- Footer section
- Chatbot
- VideoPage component

For each component:
1. Convert layout (flexbox, grid)
2. Convert spacing (margin, padding)
3. Convert colors and backgrounds
4. Convert typography
5. Convert borders and shadows
6. Convert hover/focus states
7. Test immediately

### Testing Checkpoint ✓ (After EACH Component)

- [ ] Run `npm run next-dev`
- [ ] Compare to original (Vite version):
  - [ ] Take side-by-side screenshots
  - [ ] Compare at all breakpoints
- [ ] Test component interactions
- [ ] Verify hover/focus states
- [ ] Check responsive behavior
- [ ] Verify RTL layout
- [ ] Deploy to Vercel preview for stakeholder review

**Success Criteria**: Each component looks identical after conversion

---

## Phase 4C: CSS Finalization

**Goal**: Complete CSS transition to pure Tailwind

### Tasks

1. **Review all converted components**:
   - Verify no old CSS classes remain
   - Check for any missed styles

2. **Consolidate custom CSS** in `app/globals.css`:
   - Only complex animations (@keyframes)
   - Only patterns impossible in Tailwind
   - Document why each custom style is needed

3. **Optimize Tailwind config**:
   - Review custom theme values
   - Remove unused extensions
   - Add any missing utilities

4. **Remove old CSS files**:
   - Delete `src/styles-original.css`
   - Delete `src/App.css`
   - Delete `src/index.css`
   - Update imports in any files

5. **Clean up `app/globals.css`**:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
     html {
       direction: rtl;
     }
   }

   @layer components {
     /* Only complex patterns that can't be utilities */
   }

   @layer utilities {
     /* Custom utilities if needed */
   }

   /* Custom animations */
   @keyframes breathing {
     /* ... */
   }
   ```

6. **Verify no CSS conflicts**:
   - Check browser dev tools for unused CSS
   - Verify no specificity issues
   - Check for any `!important` usage (remove if possible)

7. **Optimize for production**:
   - Tailwind will automatically purge unused CSS
   - Verify build output is smaller than before

### Testing Checkpoint ✓

- [ ] Full regression test on all 6 pages
- [ ] All breakpoints (mobile, tablet, desktop)
- [ ] All interactions (forms, menus, videos)
- [ ] RTL verification on every section
- [ ] **Performance test**:
  - [ ] Run Lighthouse audit
  - [ ] Compare bundle size: before vs after
  - [ ] Expect improvements:
    - Smaller CSS bundle
    - Better performance scores
    - Faster load times
- [ ] Deploy to Vercel preview
- [ ] Cross-browser testing:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Mobile browsers

**Success Criteria**:
- Pure Tailwind CSS (minimal custom CSS)
- Identical appearance to original
- Better performance metrics
- Smaller bundle size

---

## Phase 5: Assets & Static Files

**Goal**: Ensure all assets work correctly in static export

### Tasks

1. **Verify `/public` directory structure**:
   ```
   public/
   ├── assets/
   │   ├── *.webp (images)
   │   ├── *.avif (images)
   │   └── wallpaper.png
   ├── CNAME
   ├── robots.txt
   └── sitemap.xml
   ```

2. **Update asset references** (if needed):
   - Remove Vite-specific `import.meta.env.BASE_URL` logic
   - Use Next.js paths: `/assets/image.webp`
   - Update `src/utils/assets.js` or remove if obsolete

3. **Verify image loading**:
   - Check all images in components
   - Verify WebP with AVIF fallback works
   - Use standard `<img>` tags (no `next/image` in static export)

4. **Test static files**:
   - CNAME file for custom domain
   - robots.txt for SEO
   - sitemap.xml for search engines

5. **Update sitemap.xml** (if needed):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://singwithalon.com/</loc>
       <lastmod>2024-01-01</lastmod>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>https://singwithalon.com/video/tadmit/</loc>
       <lastmod>2024-01-01</lastmod>
       <priority>0.8</priority>
     </url>
     <!-- ... other video pages ... -->
   </urlset>
   ```

6. **Verify favicon and meta images**:
   - Favicon in root or public
   - OG images for social sharing

### Testing Checkpoint ✓

- [ ] Run `npm run next-build`
- [ ] Verify `out/` folder structure:
  ```
  out/
  ├── index.html
  ├── video/
  │   ├── tadmit/index.html
  │   └── ...
  ├── _next/ (Next.js assets)
  ├── assets/ (copied from public)
  ├── CNAME
  ├── robots.txt
  └── sitemap.xml
  ```
- [ ] Serve production build locally:
  ```bash
  npx serve out -p 3002
  ```
- [ ] Test `localhost:3002`:
  - [ ] All images load correctly
  - [ ] WebP/AVIF formats work
  - [ ] Videos play correctly
  - [ ] Fonts load correctly
  - [ ] CNAME file accessible
  - [ ] robots.txt accessible (`/robots.txt`)
  - [ ] sitemap.xml accessible (`/sitemap.xml`)
- [ ] Deploy to Vercel and test

**Success Criteria**: Production build works perfectly locally and on Vercel

---

## Phase 6: SEO & Metadata Validation

**Goal**: Ensure SEO is equivalent or better than Vite version

### Tasks

1. **Build both versions**:
   ```bash
   # Vite build
   npm run build

   # Next.js build
   npm run next-build
   ```

2. **Compare HTML output** for each route:
   - `dist/index.html` vs `out/index.html`
   - `dist/video/tadmit/index.html` vs `out/video/tadmit/index.html`
   - Check for all meta tags
   - Verify structured data (JSON-LD)

3. **Validate metadata completeness**:
   - [ ] Title tags
   - [ ] Meta descriptions
   - [ ] Keywords meta tags
   - [ ] Open Graph tags (og:title, og:description, og:image, og:type)
   - [ ] Twitter Card tags
   - [ ] Canonical URLs
   - [ ] Language tags (`lang="he"`)
   - [ ] Direction (`dir="rtl"`)

4. **Validate structured data**:
   - Use Google Rich Results Test: https://search.google.com/test/rich-results
   - Test each video page for VideoObject schema
   - Verify no errors or warnings

5. **Test Open Graph tags**:
   - Use Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Test homepage and video pages
   - Verify images load and preview looks good

6. **Test Twitter Cards**:
   - Use Twitter Card Validator: https://cards-dev.twitter.com/validator
   - Verify card type and content

7. **Run Lighthouse SEO audit**:
   ```bash
   # For both versions
   npm run lighthouse -- --only-categories=seo
   ```
   - Compare scores
   - Address any issues

8. **Check crawlability**:
   - Verify robots.txt allows crawling
   - Verify sitemap.xml is valid
   - Test with Google Search Console (if set up)

### Testing Checkpoint ✓

- [ ] **HTML comparison**:
  - [ ] View source for all 6 pages (both versions)
  - [ ] Verify all meta tags present
  - [ ] Check structured data in HTML
- [ ] **Validation tools**:
  - [ ] Google Rich Results Test: PASS
  - [ ] Facebook Sharing Debugger: PASS
  - [ ] Twitter Card Validator: PASS
  - [ ] W3C HTML Validator: No errors
- [ ] **Lighthouse SEO**:
  - [ ] Next.js score >= Vite score
  - [ ] Target: 95+ SEO score
- [ ] **Manual checks**:
  - [ ] All images have alt text
  - [ ] Headings hierarchy correct (h1, h2, h3)
  - [ ] Links have descriptive text
  - [ ] No broken links

**Success Criteria**: Next.js SEO is equal or better than Vite, all validation tests pass

---

## Phase 7: End-to-End Testing

**Goal**: Comprehensive testing before Vite removal

### Testing Categories

#### 1. Functional Testing

**Homepage**:
- [ ] Navigation menu works (all links)
- [ ] Mobile hamburger menu opens/closes
- [ ] Smooth scroll to sections works
- [ ] Hero section displays correctly
- [ ] About section content visible
- [ ] Video gallery displays all videos
- [ ] Video gallery modal opens/closes
- [ ] Services section displays correctly
- [ ] Testimonials carousel/slider works
- [ ] Contact form validation works
- [ ] Contact form submits (WhatsApp integration)
- [ ] Footer links work
- [ ] Chatbot opens/closes
- [ ] Chatbot interactions work

**Video Pages**:
- [ ] All 5 video pages load
- [ ] Video player works
- [ ] Back to gallery link works
- [ ] Navigation menu works

#### 2. Performance Testing

Run Lighthouse audit for all pages:
```bash
# Homepage
lighthouse https://your-vercel-url.vercel.app --view

# Video pages
lighthouse https://your-vercel-url.vercel.app/video/tadmit --view
```

**Target metrics**:
- [ ] Performance: 90+
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 95+

**Core Web Vitals**:
- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] FID (First Input Delay): < 100ms
- [ ] CLS (Cumulative Layout Shift): < 0.1

**Additional checks**:
- [ ] Total bundle size smaller than Vite
- [ ] CSS bundle size smaller (pure Tailwind)
- [ ] Images optimized (WebP/AVIF)
- [ ] Fonts load efficiently

#### 3. Cross-Browser Testing

Test on:
- [ ] **Chrome** (desktop + mobile)
- [ ] **Firefox** (desktop + mobile)
- [ ] **Safari** (desktop + iOS)
- [ ] **Edge** (desktop)
- [ ] **Mobile browsers** (iOS Safari, Android Chrome)

For each browser:
- [ ] Layout renders correctly
- [ ] RTL direction works
- [ ] Animations work smoothly
- [ ] Forms work
- [ ] Videos play

#### 4. Accessibility Testing

- [ ] **Keyboard navigation**:
  - [ ] Tab through all interactive elements
  - [ ] Focus indicators visible
  - [ ] Skip links work (if any)
- [ ] **Screen reader**:
  - [ ] Test with VoiceOver (Mac) or NVDA (Windows)
  - [ ] All images have alt text
  - [ ] ARIA labels present where needed
  - [ ] Headings announce correctly
- [ ] **Color contrast**:
  - [ ] All text meets WCAG AA standards
  - [ ] Links distinguishable from text
- [ ] **Form accessibility**:
  - [ ] Labels associated with inputs
  - [ ] Error messages announced
  - [ ] Required fields indicated

#### 5. Responsive Design Testing

Test at breakpoints:
- [ ] **Mobile (320px - 767px)**:
  - [ ] All content readable
  - [ ] No horizontal scroll
  - [ ] Touch targets large enough (44x44px)
  - [ ] Mobile menu works
- [ ] **Tablet (768px - 1023px)**:
  - [ ] Layout adjusts appropriately
  - [ ] Grid columns adjust
- [ ] **Desktop (1024px+)**:
  - [ ] Full layout displays
  - [ ] Max-width containers work

#### 6. RTL (Right-to-Left) Testing

- [ ] Text flows right-to-left
- [ ] Flexbox items align correctly (start/end not left/right)
- [ ] Grid layouts mirror correctly
- [ ] Margins and paddings flip correctly
- [ ] Icons and arrows point correct direction
- [ ] Animations and transitions work in RTL
- [ ] Form inputs align correctly

#### 7. Load Testing

Test on different connection speeds:
- [ ] **Fast 3G** (simulated in DevTools)
- [ ] **Slow 3G** (simulated in DevTools)
- [ ] Site remains usable on slow connections

#### 8. Integration Testing

- [ ] **WhatsApp integration**:
  - [ ] Contact form generates correct WhatsApp message
  - [ ] WhatsApp link opens correctly (mobile + desktop)
  - [ ] Message includes correct phone number (052-896-2110)
  - [ ] Message includes form data
- [ ] **Video integrations**:
  - [ ] Videos hosted on Cloudflare R2 load
  - [ ] Video posters display before play
  - [ ] Video controls work

### Testing Checklist

Create a spreadsheet or document with:
- Feature/Component
- Expected behavior
- Test result (Pass/Fail)
- Notes
- Browser/Device tested

### Testing Checkpoint ✓

- [ ] Complete all functional tests: 100% pass rate
- [ ] Performance targets met on all pages
- [ ] Cross-browser testing complete: no critical issues
- [ ] Accessibility audit: no critical issues
- [ ] Responsive design verified at all breakpoints
- [ ] RTL layout works perfectly
- [ ] Load testing: acceptable performance on slow connections
- [ ] Integration tests pass
- [ ] Document any minor issues (non-blocking)

**Success Criteria**:
- All critical tests pass
- No regressions from Vite version
- Performance equal or better
- Ready to remove Vite and go live

---

## Phase 8: Vite Removal & Next.js as Primary

**Goal**: Remove Vite completely, make Next.js the only system

### Tasks

1. **Remove Vite dependencies** from `package.json`:
   ```bash
   npm uninstall vite @vitejs/plugin-react vite-plugin-compression
   ```

2. **Remove prerendering dependencies**:
   ```bash
   npm uninstall puppeteer serve gh-pages
   ```

3. **Remove old scripts** from `package.json`:
   ```json
   {
     "scripts": {
       "dev": "next dev",           // Changed from vite
       "build": "next build",        // Changed from vite build + prerender
       "start": "next start",        // New: for production testing
       "lint": "next lint"          // Changed from vite lint
     }
   }
   ```

4. **Delete Vite configuration files**:
   - `vite.config.js`
   - Delete `scripts/prerender.js`

5. **Delete old source directory**:
   - Delete `/src` folder completely (components now in `/app`)
   - Delete `/dist` folder (was Vite output)

6. **Delete old CSS files** (if not already done):
   - `src/styles-original.css`
   - `src/App.css`
   - `src/index.css`

7. **Update `.gitignore`**:
   ```
   # Remove
   # dist/

   # Add
   .next/
   out/
   ```

8. **Clean up root directory**:
   - Remove any Vite-specific files
   - Remove `index.html` from root (Next.js generates this)

9. **Update `package.json` metadata** (if needed):
   - Update description
   - Update repository URL
   - Update homepage URL

10. **Run clean install**:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```

### Testing Checkpoint ✓

- [ ] `npm install` succeeds (clean install)
- [ ] `npm run dev` starts Next.js dev server
- [ ] `npm run build` creates `out/` folder successfully
- [ ] `npm run start` serves production build (optional test)
- [ ] Serve production locally:
  ```bash
  npx serve out -p 3002
  ```
- [ ] Test `localhost:3002` (or `npm run start`):
  - [ ] All 6 routes work
  - [ ] All functionality works
  - [ ] No console errors
- [ ] Deploy to Vercel
- [ ] Test on Vercel preview URL
- [ ] Full regression test (same as Phase 7)

**Success Criteria**:
- Only Next.js remains in codebase
- Everything works perfectly
- No Vite references anywhere
- Smaller and cleaner codebase

**Note**: GitHub Pages can still work (deploying `out/` folder), but Vercel is now primary

---

## Phase 9: Deployment Consolidation

**Goal**: Set up reliable dual deployment (optional) or Vercel-only

### Tasks

1. **Verify Vercel deployment**:
   - Check automatic deployments work (on git push)
   - Verify preview deployments for PRs
   - Test build logs for any issues

2. **Set up custom domain on Vercel** (if ready):
   - Go to Vercel project → Settings → Domains
   - Add `singwithalon.com`
   - Get DNS configuration:
     - A record: `76.76.21.21`
     - CNAME: `cname.vercel-dns.com`
   - Update DNS provider (don't switch yet, just prepare)

3. **Optional: Keep GitHub Pages as backup**:

   **Option A: Manual deploy script**:
   ```json
   {
     "scripts": {
       "deploy:gh": "npm run build && gh-pages -d out"
     }
   }
   ```
   Install: `npm install --save-dev gh-pages`

   **Option B: GitHub Actions** (automated):
   Create `.github/workflows/deploy-gh-pages.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]
     workflow_dispatch:

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./out
   ```

4. **Test both deployments** (if doing dual):
   - Deploy to GitHub Pages
   - Verify both work:
     - Vercel: `your-project.vercel.app`
     - GitHub Pages: `yourusername.github.io/repo` or custom domain

5. **Set up monitoring**:
   - Vercel Analytics (free, built-in)
   - Google Search Console
   - Consider: Sentry for error tracking (optional)

### Testing Checkpoint ✓

- [ ] Vercel automatic deployments work
- [ ] Git push triggers new deployment
- [ ] Preview deployments work for PRs
- [ ] Custom domain configured (if ready)
- [ ] Optional: GitHub Pages backup works
- [ ] All URLs resolve correctly:
  - [ ] Vercel preview URL
  - [ ] Custom domain (if configured)
  - [ ] GitHub Pages URL (if enabled)
- [ ] Test deployments from different devices/locations

**Success Criteria**: Deployment is automated and reliable

---

## Phase 10: Enable Vercel Features (Static Export → Full Next.js)

**Goal**: Unlock Vercel-specific optimizations (remove static export limitation)

### Tasks

1. **Update `next.config.js`** to remove static export:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     // Remove: output: 'export'
     // Remove: images: { unoptimized: true }

     // Add: Image optimization
     images: {
       formats: ['image/avif', 'image/webp'],
       deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
       imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
     },

     // Optional: Enable compression
     compress: true,

     // Optional: React strict mode
     reactStrictMode: true,
   }

   module.exports = nextConfig
   ```

2. **Migrate from manual images to `next/image`**:

   **Before**:
   ```jsx
   <img
     src="/assets/poster.webp"
     alt="Video poster"
     width={640}
     height={360}
   />
   ```

   **After**:
   ```jsx
   import Image from 'next/image'

   <Image
     src="/assets/poster.webp"
     alt="Video poster"
     width={640}
     height={360}
     placeholder="blur"
     blurDataURL="data:image/..." // optional
   />
   ```

3. **Update all image references** in components:
   - Navigation logo
   - Hero background (keep as video)
   - About section images
   - Video gallery posters
   - Services section images
   - Testimonials images
   - Footer images

4. **Remove manual WebP/AVIF handling**:
   - Next.js will automatically serve optimal format
   - Can delete AVIF files (Next.js generates them)
   - Keep original WebP or PNG as source

5. **Optional: Add blur placeholders**:
   - Generate blur data URLs for images
   - Improves perceived performance
   - Use plaiceholder or similar tool

6. **Optional: Enable Incremental Static Regeneration (ISR)**:

   For video pages (if content might update):
   ```jsx
   // app/video/[videoId]/page.jsx
   export const revalidate = 3600 // Revalidate every hour
   ```

7. **Test image optimization**:
   - Deploy to Vercel
   - Check Network tab in DevTools
   - Verify:
     - Images served in AVIF (if supported)
     - Images resized for device
     - Lazy loading works
     - Blur placeholders show

### Testing Checkpoint ✓

- [ ] Update `next.config.js`
- [ ] Convert all `<img>` to `<Image>`
- [ ] Run `npm run dev` locally:
  - [ ] Images load correctly
  - [ ] No console errors
  - [ ] Lazy loading works
- [ ] Run `npm run build`:
  - [ ] Build succeeds (note: no `out/` folder, different output)
  - [ ] No image optimization errors
- [ ] Deploy to Vercel
- [ ] Test on Vercel:
  - [ ] All images load
  - [ ] Check Network tab:
    - [ ] AVIF format served (in supporting browsers)
    - [ ] Responsive sizes served
    - [ ] Proper caching headers
  - [ ] Test on different devices/screens
  - [ ] Test lazy loading (scroll behavior)
- [ ] **Performance test**:
  - [ ] Run Lighthouse audit
  - [ ] Expect improvements:
    - Better image metrics
    - Smaller image sizes
    - Better LCP (Largest Contentful Paint)
  - [ ] Compare before/after metrics

**Success Criteria**:
- Images optimized automatically by Vercel
- Better performance metrics
- Smaller image sizes served
- No regressions in functionality

**IMPORTANT NOTE**: After this phase, site CANNOT be deployed to GitHub Pages (requires server for image optimization). Vercel is now required.

---

## Phase 11: Vercel-Only Optimizations

**Goal**: Take full advantage of Vercel platform features

### Optional Enhancements

#### 1. Edge Runtime (Optional)

Convert pages to Edge Runtime for faster cold starts:
```jsx
// app/page.jsx or app/video/[videoId]/page.jsx
export const runtime = 'edge' // or 'nodejs' (default)
```

Benefits:
- Faster response times (< 50ms)
- Global distribution
- Lower latency

Test carefully - not all Node.js APIs work in Edge

#### 2. Vercel Analytics

Enable in Vercel dashboard:
- Project → Analytics
- Free tier: 2,500 events/month
- Tracks page views, unique visitors, top pages

Add to your app (optional, analytics work without this):
```jsx
// app/layout.jsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### 3. Speed Insights

Monitor Core Web Vitals:
```bash
npm install @vercel/speed-insights
```

```jsx
// app/layout.jsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

#### 4. Font Optimization

Replace CDN fonts with `next/font/google`:
```jsx
// app/layout.jsx
import { Heebo } from 'next/font/google'
import localFont from 'next/font/local'

const heebo = Heebo({
  subsets: ['hebrew'],
  weight: ['300', '400', '700'],
  variable: '--font-heebo',
  display: 'swap',
})

const secularOne = localFont({
  src: '../public/fonts/SecularOne-Regular.woff2',
  variable: '--font-secular',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${secularOne.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
```

Update `tailwind.config.js`:
```js
fontFamily: {
  sans: ['var(--font-heebo)', 'sans-serif'],
  heading: ['var(--font-secular)', 'cursive'],
},
```

Benefits:
- Faster font loading
- No external requests
- Automatic subsetting

#### 5. Middleware (Optional)

Add redirects, security headers, or A/B testing:
```js
// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  // Example: Add security headers
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: '/(.*)',
}
```

#### 6. API Routes (Future)

If you need backend features:
```js
// app/api/contact/route.js
export async function POST(request) {
  const data = await request.json()
  // Handle form submission, send email, etc.
  return Response.json({ success: true })
}
```

#### 7. Environment Variables

For sensitive data (if needed):
- Vercel dashboard → Project → Settings → Environment Variables
- Access in code: `process.env.YOUR_VAR`

### Testing Checkpoint ✓

For each enhancement you enable:
- [ ] Deploy to Vercel
- [ ] Test functionality
- [ ] Monitor analytics/speed insights
- [ ] Verify performance improvements
- [ ] Check for any issues

**Success Criteria**: Fully optimized Vercel deployment with monitoring

---

## Phase 12: GitHub Pages Deprecation & Documentation

**Goal**: Finalize migration, clean up old deployment, update docs

### Tasks

1. **Decide on GitHub Pages**:
   - **Option A**: Keep as archive/backup (no updates)
   - **Option B**: Deprecate completely and redirect

2. **If deprecating GitHub Pages**:
   - Disable GitHub Pages in repo settings
   - Or: Create redirect page in `gh-pages` branch pointing to Vercel

3. **Update DNS to point to Vercel** (if using custom domain):
   - Update DNS A record to Vercel IP
   - Remove old GitHub Pages CNAME (if different)
   - Wait for DNS propagation (can take 24-48 hours)
   - Test: `dig singwithalon.com` should show Vercel IP

4. **Update documentation**:

   **Update `CLAUDE.md`**:
   ```md
   # CLAUDE.md

   This file provides guidance to Claude Code when working with this codebase.

   ## Project Overview

   Professional Hebrew RTL landing page for Alon Cohen, Israeli musician.
   Built with Next.js 15 (App Router) and deployed on Vercel.

   ## Architecture

   **Framework**: Next.js 15 with App Router
   **Styling**: Tailwind CSS
   **Deployment**: Vercel (https://singwithalon.com)
   **Build**: Automatic on git push

   ## Development Commands

   - `npm run dev` - Start dev server (localhost:3000)
   - `npm run build` - Build for production
   - `npm run start` - Start production server locally
   - `npm run lint` - Lint code

   ## File Structure

   ```
   app/
   ├── layout.jsx         # Root layout (RTL, fonts, metadata)
   ├── page.jsx           # Homepage
   ├── video/[videoId]/
   │   └── page.jsx      # Dynamic video pages
   ├── components/        # React components
   └── globals.css       # Tailwind + custom CSS

   public/
   ├── assets/           # Images (auto-optimized by Vercel)
   ├── CNAME
   ├── robots.txt
   └── sitemap.xml
   ```

   ## Key Features

   - RTL (Right-to-Left) Hebrew layout
   - 6 routes: homepage + 5 video pages
   - Automatic image optimization (next/image)
   - SSG (Static Site Generation) for all pages
   - SEO optimized (metadata API, structured data)
   - Musical design system (purple theme, animations)
   - Responsive (mobile-first)
   - Tailwind CSS (pure utility classes)

   ## Deployment

   Automatic deployment via Vercel:
   - Push to `main` branch → Production deploy
   - Push to other branches → Preview deploy
   - PRs automatically get preview URLs

   ## Making Changes

   1. **Content**: Edit components in `app/components/`
   2. **Styling**: Use Tailwind classes, extend `tailwind.config.js` if needed
   3. **New pages**: Create in `app/` directory (file-based routing)
   4. **Images**: Add to `public/assets/`, use `<Image>` component
   5. **SEO**: Update `generateMetadata()` in page files

   ## Important Notes

   - All text is Hebrew (RTL)
   - Custom purple theme (#8b5fbf, #b19cd9)
   - Musical design elements throughout
   - Phone: 052-896-2110
   - Email: contact@singwithalon.com
   ```

   **Update `README.md`** (if exists):
   - Change architecture section
   - Update development commands
   - Update deployment instructions
   - Remove Vite references
   - Remove Puppeteer references

5. **Update `package.json` metadata**:
   ```json
   {
     "name": "singwithalon-nextjs",
     "version": "2.0.0",
     "description": "Professional Hebrew landing page for Alon Cohen - Israeli musician. Built with Next.js 15.",
     "homepage": "https://singwithalon.com",
     "repository": {
       "type": "git",
       "url": "https://github.com/yourusername/singwithalon"
     }
   }
   ```

6. **Clean up repository**:
   - Remove old documentation about Vite
   - Remove prerendering docs
   - Archive migration plan (this document) in `/docs` folder

7. **Create summary of changes**:
   - Document what changed
   - Document performance improvements
   - Document new features enabled
   - Save for future reference

8. **Optional: Blog post or changelog**:
   - Document the migration journey
   - Share learnings
   - Publish on dev.to or personal blog

### Testing Checkpoint ✓

- [ ] DNS updated and propagated
- [ ] Custom domain works: `https://singwithalon.com`
- [ ] HTTPS works (Vercel handles SSL automatically)
- [ ] All pages load on production domain
- [ ] GitHub Pages disabled or redirecting
- [ ] Documentation updated and accurate
- [ ] Repository clean (no old build files)
- [ ] Package.json metadata updated

**Success Criteria**:
- Single deployment on Vercel
- Documentation accurate and complete
- Production site fully functional
- Migration complete! 🎉

---

## Rollback Strategy

### Before Phase 8 (Vite Removal)
- Vite still works completely
- Can abandon migration and continue with Vite
- Both GitHub Pages and Vercel working

### Phase 8 - Phase 9 (After Vite Removal)
- Next.js in static export mode
- Can deploy to GitHub Pages OR Vercel
- Can restore Vite from git history if critical issues

### Phase 10+ (After Enabling Vercel Features)
- Vercel-only (server features enabled)
- Can revert `next.config.js` to re-enable static export if needed
- Can restore from git commits

### Emergency Rollback
If critical issues after going live:
1. Revert DNS to point back to GitHub Pages (if still active)
2. Restore Vite version from git: `git revert` or restore from backup
3. Deploy Vite build to GitHub Pages
4. Fix Next.js issues in separate branch
5. Re-deploy when ready

---

## Testing Tools & Resources

### Visual Regression Testing
- Percy (visual testing): https://percy.io
- Chromatic (Storybook): https://www.chromatic.com
- Manual: Side-by-side screenshots

### Performance Testing
- Lighthouse: Built into Chrome DevTools
- WebPageTest: https://www.webpagetest.org
- Vercel Speed Insights: Built-in
- GTmetrix: https://gtmetrix.com

### SEO Testing
- Google Rich Results Test: https://search.google.com/test/rich-results
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- Schema.org Validator: https://validator.schema.org
- Google Search Console: https://search.google.com/search-console

### Accessibility Testing
- WAVE: https://wave.webaim.org
- axe DevTools: Browser extension
- Lighthouse Accessibility: Built into Chrome DevTools
- Screen readers: VoiceOver (Mac), NVDA (Windows)

### Cross-Browser Testing
- BrowserStack: https://www.browserstack.com
- LambdaTest: https://www.lambdatest.com
- Manual: Test on physical devices

---

## Timeline & Estimates

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1 | Next.js Setup | 1 hour |
| 2 | Homepage Migration | 3-4 hours |
| 3 | Video Pages Migration | 2-3 hours |
| 3.5 | Deploy to Vercel | 1 hour |
| 4A | CSS Planning | 1 hour |
| 4B | CSS Refactoring (incremental) | 6-8 hours |
| 4C | CSS Finalization | 2 hours |
| 5 | Assets & Static Files | 1 hour |
| 6 | SEO Validation | 1-2 hours |
| 7 | E2E Testing | 2-3 hours |
| 8 | Vite Removal | 1 hour |
| 9 | Deployment Consolidation | 1 hour |
| 10 | Enable Vercel Features | 2-3 hours |
| 11 | Vercel Optimizations | 1-2 hours |
| 12 | Documentation & Cleanup | 1 hour |
| **TOTAL** | | **24-30 hours** |

**Note**: Times are estimates. Actual time may vary based on:
- Complexity of CSS conversion
- Number of issues discovered during testing
- Familiarity with Next.js
- Stakeholder review cycles

**Recommended Approach**:
- Allocate 1-2 hours per day over 2-3 weeks
- Or: Dedicate 3-4 full days for focused migration
- Build in buffer time for unexpected issues

---

## Key Benefits Summary

### Before (Vite + React)
- ❌ Custom Puppeteer prerendering script
- ❌ Manual SSG process
- ❌ 64KB legacy CSS + Tailwind
- ❌ Manual image optimization
- ❌ Limited deployment options
- ❌ Complex build process

### After (Next.js + Vercel)
- ✅ Built-in SSG (no custom scripts)
- ✅ Automatic prerendering
- ✅ Pure Tailwind CSS (cleaner, smaller)
- ✅ Automatic image optimization (next/image)
- ✅ Vercel Edge Network (global CDN)
- ✅ Automatic deployments (git push → deploy)
- ✅ Preview deployments (test before production)
- ✅ Analytics built-in (Vercel Analytics)
- ✅ Better performance (Core Web Vitals)
- ✅ Future-proof (easy to add SSR, ISR, API routes)
- ✅ Simpler codebase (less custom code)

### Performance Improvements Expected
- 📈 **Lighthouse Score**: 85-90 → 95-100
- 📉 **Bundle Size**: 20-30% reduction (pure Tailwind)
- 📉 **Image Sizes**: 30-50% reduction (automatic optimization)
- ⚡ **LCP**: Improved (optimized images)
- ⚡ **FCP**: Improved (Edge delivery)
- ⚡ **TTI**: Improved (smaller bundles)

---

## Success Metrics

Track these metrics before and after migration:

### Performance
- [ ] Lighthouse Performance Score: ___ → ___
- [ ] LCP (Largest Contentful Paint): ___ → ___
- [ ] FCP (First Contentful Paint): ___ → ___
- [ ] TTI (Time to Interactive): ___ → ___
- [ ] Total Bundle Size: ___ KB → ___ KB
- [ ] CSS Bundle Size: ___ KB → ___ KB

### SEO
- [ ] Lighthouse SEO Score: ___ → ___
- [ ] Meta tags completeness: ___% → ___%
- [ ] Structured data validation: Pass/Fail → Pass/Fail
- [ ] Core Web Vitals: Pass/Fail → Pass/Fail

### Deployment
- [ ] Build time: ___ min → ___ min
- [ ] Deploy time: ___ min → ___ min
- [ ] Deploy process: Manual → Automatic

### Developer Experience
- [ ] Hot reload speed: ___ ms → ___ ms
- [ ] Lines of custom build code: ___ → 0
- [ ] Dependencies: ___ → ___

---

## Conclusion

This migration will modernize the singwithalon.com codebase, improving:
- **Performance**: Faster load times, better Core Web Vitals
- **SEO**: Better search engine optimization
- **Developer Experience**: Simpler codebase, better tooling
- **Maintainability**: Less custom code, industry-standard patterns
- **Scalability**: Easy to add features (API routes, ISR, SSR)

The incremental approach with testing at each phase ensures:
- No regressions
- Controlled risk
- Ability to rollback if needed
- Learning and validation at each step

**Total effort**: 24-30 hours over 2-3 weeks

**End result**: Modern, fast, maintainable Next.js site on Vercel 🚀

---

## Migration Checklist

Use this as a quick reference:

- [ ] Phase 1: Next.js Setup ✓
- [ ] Phase 2: Homepage Migration ✓
- [ ] Phase 3: Video Pages Migration ✓
- [ ] Phase 3.5: Deploy to Vercel ✓
- [ ] Phase 4A: CSS Planning ✓
- [ ] Phase 4B: CSS Refactoring ✓
- [ ] Phase 4C: CSS Finalization ✓
- [ ] Phase 5: Assets & Static Files ✓
- [ ] Phase 6: SEO Validation ✓
- [ ] Phase 7: E2E Testing ✓
- [ ] Phase 8: Vite Removal ✓
- [ ] Phase 9: Deployment Consolidation ✓
- [ ] Phase 10: Enable Vercel Features ✓
- [ ] Phase 11: Vercel Optimizations ✓
- [ ] Phase 12: Documentation & Cleanup ✓

**Migration Complete!** 🎉

---

## Support & Resources

### Next.js Documentation
- Official docs: https://nextjs.org/docs
- App Router: https://nextjs.org/docs/app
- Image Optimization: https://nextjs.org/docs/app/building-your-application/optimizing/images
- Metadata API: https://nextjs.org/docs/app/building-your-application/optimizing/metadata

### Vercel Documentation
- Vercel docs: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Deployment: https://vercel.com/docs/deployments/overview

### Tailwind CSS
- Docs: https://tailwindcss.com/docs
- RTL Plugin: https://github.com/20lives/tailwindcss-rtl

### Community
- Next.js Discord: https://nextjs.org/discord
- Vercel Discord: https://vercel.com/discord
- Stack Overflow: Tag [next.js]

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Author**: Migration plan for singwithalon.com
**Status**: Ready for implementation
