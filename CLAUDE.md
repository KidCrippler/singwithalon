# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a professional Hebrew RTL (Right-to-Left) landing page for Alon Cohen, a musician specializing in Israeli music. The site features an interactive song selection system where audiences can choose songs in real-time during performances.

## Development Environment

This is a **static website** using only vanilla HTML, CSS, and JavaScript - no build tools or package managers required.

### Local Development Commands
- **Start local server**: `python3 -m http.server 8000` then visit `http://localhost:8000`
- **Alternative server**: Use any static file server or simply open `index.html` in a browser

### Deployment Options (from README)
- **GitHub Pages**: Push to GitHub and enable GitHub Pages in repository settings
- **Netlify**: Drag and drop project folder to netlify.com
- **Vercel**: Install CLI with `npm i -g vercel`, then run `vercel` in project directory

## Architecture and Structure

### File Organization
```
singwithalon/
├── index.html          # Main homepage with all sections
├── css/styles.css      # Complete RTL styling with responsive design
├── js/script.js        # Main JavaScript functionality
├── assets/             # Images, logos, and media files
└── README.md          # Project documentation in Hebrew
```

### Main Components

**MusicianSite Class** (`js/script.js`):
- Main application controller managing all site functionality
- Methods: `setupNavigation()`, `setupScrollEffects()`, `setupVideoHandlers()`, `setupContactForm()`, `setupAnimations()`, `setupSmoothScrolling()`

**FormValidator Class** (`js/script.js:372-408`):
- Validates contact forms with Israeli phone number validation
- Email and date validation with Hebrew error messages

**PerformanceUtils Class** (`js/script.js:411-445`):
- Lazy loading for images and performance optimizations
- Critical resource preloading

### Key Features

1. **RTL Design**: Full Hebrew support from HTML `dir="rtl"` to CSS Flexbox/Grid layouts
2. **Musical Visual Identity**: Enhanced typography with Secular One font, musical symbols, sound wave animations, and warm purple color scheme
3. **Interactive Video Gallery**: Modal-based video player with custom controls
4. **WhatsApp Integration**: Contact form automatically creates WhatsApp messages
5. **Advanced Hero Typography**: Gradient text effects, multi-layer shadows, and subtle breathing animations for musical appeal
6. **Responsive Design**: Mobile-first approach with music app-inspired touches and hamburger navigation
7. **Smooth Animations**: Intersection Observer API for scroll-triggered animations plus musical-themed micro-interactions
8. **Performance Optimized**: Lazy loading, preloading, and efficient event handling

### Critical Technical Details

**RTL Implementation**:
- HTML uses `<html lang="he" dir="rtl">`
- CSS uses `direction: rtl` on html element
- Flexbox and Grid layouts are RTL-aware
- Text alignment and positioning account for RTL flow

**Video Handling**:
- Hero video uses native HTML5 controls
- Gallery videos open in custom modal (`openVideoModal()`, `closeVideoModal()`)
- Video sources hosted on external CDN (Cloudflare R2)

**Contact Form Flow**:
- Form validation with Hebrew error messages
- Generates formatted WhatsApp message with event details
- Uses `wa.me` API for cross-platform WhatsApp integration
- Fallback handling for popup blockers

**Mobile Navigation**:
- Hamburger menu with smooth animations and musical color scheme
- Music app-inspired navigation styling with gradient backgrounds
- Auto-closes on link clicks and outside clicks
- Responsive breakpoints at 768px and 480px with performance-optimized effects

**Musical Design System**:
- **Color Palette**: Warm purple gradient (#8b5fbf to #b19cd9) throughout the site
- **Typography**: Secular One font for headings adds musical personality, Heebo for body text
- **Hero Section**: Advanced text effects with multi-layer shadows, breathing animations, and solid white text
- **Musical Elements**: FontAwesome icons and Unicode symbols strategically placed across sections with enhanced visibility
- **Interactive Features**: Featured service card with musical animations and floating note effects
- **Background Patterns**: Subtle sound waves in hero section and musical staff lines in content areas

### Content Management

**Contact Information**:
- Phone: 052-896-2110 (update in index.html:380,400,460)
- Email: alon7@yahoo.com (update in index.html:390,461)

**Video Assets**:
- All videos hosted on Cloudflare R2 CDN
- Update video sources and poster images in HTML
- Video durations hardcoded in HTML (update if videos change)

**Testimonials and Services**:
- Content is hardcoded in HTML
- Update sections directly in index.html for content changes

## Important Notes

- **No Build Process**: Direct file editing, no compilation needed
- **Hebrew Content**: All user-facing text is in Hebrew with RTL layout
- **External Dependencies**: Google Fonts (Heebo + Secular One) and Font Awesome icons via CDN
- **Browser Compatibility**: Modern browsers with ES6+ support required for JavaScript features
- **Performance**: Uses modern web APIs (Intersection Observer, Service Worker registration)

## Common Tasks

When making changes to this site:
1. **Content Updates**: Edit HTML directly in `index.html`
2. **Styling Changes**: Modify `css/styles.css` (respect RTL layouts and maintain musical color palette)
3. **Musical Elements**: Update FontAwesome icons and Unicode symbols in CSS ::before/::after pseudo-elements
4. **Typography Effects**: Adjust hero section animations and text shadows in CSS keyframes
5. **JavaScript Features**: Extend `MusicianSite` class in `js/script.js`
6. **New Videos**: Update video URLs and metadata in HTML
7. **Contact Info**: Update phone/email in multiple locations in HTML
8. **Color Consistency**: Use established purple palette (#8b5fbf, #b19cd9) for new elements

Remember to test RTL layout behavior when making layout changes, maintain musical visual consistency with established design system, and verify WhatsApp integration works across devices when modifying the contact form.