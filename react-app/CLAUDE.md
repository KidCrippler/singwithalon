# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

Next.js 15 (App Router) + React 19 + Tailwind CSS + Embla Carousel. Hebrew/RTL landing page for a musician.

## Development Commands

Run all commands from this directory (`react-app/`):

```bash
npm install --legacy-peer-deps  # Required — React 19 peer dependency warnings
npm run dev                     # Dev server at http://localhost:3001
npm run build                   # Production build
npm run lint                    # ESLint (flat config v9 format)
```

**Always use `--legacy-peer-deps`** with any `npm install` command.

## Critical Gotchas

### Tailwind `important: true` + Inline Styles

`tailwind.config.js` has `important: true`. When using inline `style` alongside Tailwind classes, all related CSS properties must go in the **same inline object** — otherwise the Tailwind class won't apply:

```jsx
// ✅ CORRECT — all background properties together in inline object
<section style={{ backgroundColor: 'rgba(255,255,255,0.96)', backgroundImage: '...', backgroundSize: '20px 60px' }}>

// ❌ WRONG — Tailwind bg-white/96 won't apply due to inline style specificity
<section className="bg-white/96" style={{ backgroundImage: '...' }}>
```

### Conditional Visibility — Use Classes, Not Inline Styles

```jsx
// ✅ CORRECT
className={`py-3 px-5 ${isTyping ? 'flex' : 'hidden'}`}

// ❌ WRONG — breaks with important: true
className="py-3 px-5 flex" style={{ display: isTyping ? 'flex' : 'none' }}
```

## Styling

- **Tailwind CSS** for all utility styling. Custom extensions in `tailwind.config.js`: colors (`primary`, `primary-light`), shadows (`musical`, `musical-glow`), 14 custom animations.
- **`app/globals.css`** (~416 lines) for complex effects that can't be done in Tailwind alone: nav underline animations, Hero particle blur/glow, Embla carousel styles, musical note decorations.
- **No formatter configured** — ESLint only (flat config at `eslint.config.js`).

## RTL Layout

The site is Hebrew. `<html lang="he" dir="rtl">` is set in `app/layout.jsx`. Flexbox/Grid automatically reverse for RTL, text aligns right by default, Embla Carousel is configured with `direction: 'rtl'`. **Always test RTL behavior when modifying layouts.**

## Components

All components use `'use client'` directive. Video pages at `app/video/[videoId]/page.jsx` use `generateStaticParams()` for static generation at build time.

## Deployment

Vercel auto-deploys on every push to `main`. Custom domain `singwithalon.com` via Cloudflare DNS. No `vercel.json` needed — Vercel auto-detects Next.js.
