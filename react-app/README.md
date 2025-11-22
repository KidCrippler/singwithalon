# Sing with Alon Cohen - Next.js Landing Page

Professional Hebrew RTL landing page for Alon Cohen, a musician specializing in Israeli music. Features an interactive song selection system for live performances.

## Tech Stack

- **Next.js 15** - App Router with static generation
- **React 19** - Modern React with hooks
- **Tailwind CSS** - Utility-first styling
- **Embla Carousel** - Testimonials carousel
- **Vercel** - Production hosting

## Features

- ✅ **RTL Support** - Full Hebrew right-to-left layout
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Video Gallery** - Professional video showcase with Cloudflare R2 CDN
- ✅ **WhatsApp Integration** - Contact form with Israeli phone validation
- ✅ **Animated Particles** - 60 floating musical symbols in hero section
- ✅ **SEO Optimized** - Pre-rendered static pages, structured data
- ✅ **Performance** - Optimized images (AVIF/WebP), code splitting

## Development

### Initial Setup

```bash
cd react-app
npm install --legacy-peer-deps
```

**Note**: `--legacy-peer-deps` is required due to React 19 peer dependency warnings.

### Running Development Server

```bash
npm run dev
```

The site will be available at `http://localhost:3001`

### Building for Production

```bash
npm run build     # Build Next.js app
npm run start     # Preview production build locally
```

### Linting

```bash
npm run lint      # ESLint check
```

## Deployment

### Vercel (Production)

The site automatically deploys to Vercel on every push to the `main` branch.

- **Domain**: https://singwithalon.com
- **DNS**: Cloudflare → Vercel
- **SSL**: Auto-managed by Vercel

### Manual Deployment

```bash
vercel --prod     # Deploy from local machine without git push
```

## Project Structure

```
react-app/
├── app/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   ├── Hero.jsx     # Hero with 60 animated particles
│   │   ├── Navigation.jsx
│   │   ├── VideoGallery.jsx
│   │   ├── Testimonials.jsx
│   │   └── ...
│   ├── video/
│   │   └── [videoId]/   # Dynamic video pages
│   ├── layout.jsx       # Root layout + metadata
│   ├── page.jsx         # Homepage
│   └── globals.css      # Tailwind + custom CSS
├── public/
│   └── assets/          # Images, videos
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Key Components

### Hero Section
- 60 animated musical particles (♪ ♫ ♬)
- 3-layer depth system (back, mid, front)
- Mobile optimizations reduce particle count
- Respects `prefers-reduced-motion`

### Video Gallery
- Responsive grid layout
- Dynamic routes: `/video/tadmit/`, `/video/rony/`, etc.
- Cloudflare R2 CDN hosting
- AVIF/WebP poster images

### Contact Form
- WhatsApp integration (`wa.me` API)
- Israeli phone validation (052-XXX-XXXX)
- Hebrew error messages
- Event details collection

### Testimonials
- Embla Carousel with autoplay (7s)
- RTL support
- Keyboard navigation (arrow keys)
- Responsive: 1 card (mobile), 2 (tablet), 3 (desktop)

## RTL (Right-to-Left) Support

Critical for Hebrew content:
- HTML: `<html lang="he" dir="rtl">`
- Flexbox/Grid automatically reverse
- Text alignment defaults to right
- Embla Carousel configured with `direction: 'rtl'`

**Important**: Always test RTL behavior when modifying layouts.

## Styling

### Tailwind CSS
Primary styling method using utility classes:
```jsx
<div className="bg-primary text-white p-4 rounded-lg shadow-musical">
```

### Custom CSS (globals.css)
Complex effects that can't be expressed in Tailwind:
- Hero particle blur filters
- Musical note decorations
- Complex multi-layer gradients
- Accessibility (prefers-reduced-motion)

### Theme Colors
- Primary: `#8b5fbf` (purple)
- Primary Light: `#b19cd9`
- Used in buttons, links, accents

## Adding New Videos

1. Add metadata to `app/data/videos.js`
2. Upload video to Cloudflare R2 CDN
3. Add poster image to `public/assets/`
4. Rebuild - Next.js auto-generates static page

## Performance

- **Bundle Size**: Optimized with Next.js code splitting
- **Images**: AVIF primary, WebP fallback
- **Fonts**: Google Fonts with `display=swap`
- **Particles**: Reduced on mobile via CSS media queries

## Browser Support

Modern browsers with ES6+ support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Contact Information

- **Phone**: 052-896-2110
- **Email**: contact@singwithalon.com
- **WhatsApp**: +972-52-896-2110

## License

All rights reserved © 2024 Alon Cohen
