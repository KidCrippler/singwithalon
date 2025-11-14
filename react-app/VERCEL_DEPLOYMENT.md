# Vercel Deployment Guide

This guide will walk you through deploying your Next.js site to Vercel in static export mode.

## Prerequisites

- GitHub repository with your code pushed
- A Vercel account (free tier works fine)

## Deployment Steps

### Option 1: Vercel Dashboard (Recommended for First Deployment)

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign up or log in (use your GitHub account for easier integration)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository: `singwithalon/react-app`
   - If not listed, click "Adjust GitHub App Permissions" to grant access

3. **Configure Project**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `react-app` (since Next.js is in a subdirectory)
   - **Build Command**: `npm run next-build` (already configured in vercel.json)
   - **Output Directory**: `out` (already configured in vercel.json)
   - **Install Command**: `npm install`

4. **Environment Variables**
   - None needed for static export mode
   - You can add them later if needed

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes for the build to complete
   - You'll get a preview URL like `https://singwithalon-xxxxx.vercel.app`

### Option 2: Vercel CLI (Alternative)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Navigate to your project directory
cd /Users/alonc/singwithalon/react-app

# Deploy (first time - will ask questions)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? singwithalon (or your choice)
# - Directory? ./ (current directory)
# - Override settings? No (vercel.json has them)

# Deploy to production
vercel --prod
```

## Verification Steps

After deployment, verify the following:

### 1. Homepage Test
- Visit your Vercel URL
- Check that the homepage loads correctly
- Verify RTL layout works
- Test the hero video plays
- Check navigation works
- Test contact form WhatsApp integration

### 2. Video Pages Test
Visit each video page:
- `https://your-url.vercel.app/video/tadmit/`
- `https://your-url.vercel.app/video/rony/`
- `https://your-url.vercel.app/video/jam-toren/`
- `https://your-url.vercel.app/video/borot/`
- `https://your-url.vercel.app/video/kvar-avar/`

For each video page, verify:
- ✅ Video title and description display correctly
- ✅ Video player loads and plays
- ✅ "Back to site" button works
- ✅ Page title shows in browser tab

### 3. SEO Test
- View page source (right-click → View Page Source)
- Verify meta tags are present in `<head>`
- Check for Schema.org JSON-LD script tags
- Use [Google Rich Results Test](https://search.google.com/test/rich-results) to validate structured data

### 4. Performance Test
- Use [PageSpeed Insights](https://pagespeed.web.dev/)
- Enter your Vercel URL
- Check both Mobile and Desktop scores
- Compare with current GitHub Pages scores

## Custom Domain Setup (Optional)

After verifying deployment works:

1. **In Vercel Dashboard**
   - Go to your project → Settings → Domains
   - Click "Add Domain"
   - Enter: `singwithalon.com`
   - Follow DNS configuration instructions

2. **Update DNS Records**
   - Add CNAME record pointing to Vercel
   - Or use Vercel nameservers (easier)

3. **Wait for DNS Propagation**
   - Usually takes 5-60 minutes
   - Vercel will auto-issue SSL certificate

## Rollback Plan

If anything goes wrong:
- GitHub Pages is still live at your current URL
- Vercel deployment doesn't affect GitHub Pages
- You can delete the Vercel project anytime
- Your code remains unchanged in GitHub

## Next Steps After Successful Deployment

Once Vercel deployment is verified:
1. Keep both deployments running for a week
2. Monitor Vercel analytics
3. Compare performance metrics
4. Test with real users
5. Plan switch from GitHub Pages to Vercel as primary domain

## Troubleshooting

**Build fails on Vercel:**
- Check build logs in Vercel dashboard
- Verify vercel.json configuration
- Ensure all dependencies are in package.json

**Pages show 404:**
- Verify `trailingSlash: true` in next.config.js
- Check that URLs end with `/`
- Verify static export completed successfully

**Assets not loading:**
- Check that `/public/assets/` directory is committed
- Verify asset paths use `/assets/` not relative paths
- Check browser console for 404 errors

**Styles not applying:**
- Verify CSS files are imported in app/layout.jsx
- Check that Font Awesome and Google Fonts CDN links work
- Inspect element to verify CSS classes are present

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Static Export Docs: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- Vercel Support: https://vercel.com/support
