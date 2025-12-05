# Deployment Guide

This guide covers deploying the SingWithAlon platform:
- **Backend** → Railway (paid account)
- **Frontend** → Vercel (free account)
- **Domain**: `yousing.live` (name.com)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Backend Deployment (Railway)](#backend-deployment-railway)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [ ] Railway account (paid plan for persistent volumes)
- [ ] Vercel account (free tier works)
- [ ] GitHub repository with the platform code
- [ ] Domain `yousing.live` registered on name.com
- [ ] Generate a cookie secret: `openssl rand -hex 32`

---

## Local Development Setup

Before deploying, ensure local development is working.

### Create Backend `.env` File

1. Navigate to the backend directory:
   ```bash
   cd platform/backend
   ```

2. Create a `.env` file:
   ```bash
   touch .env
   ```

3. Open `.env` in your editor and add:
   ```env
   # Server
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=development

   # Database (relative path for local dev)
   DATABASE_PATH=../database/singalong.db

   # Authentication - REQUIRED
   # Generate with: openssl rand -hex 32
   COOKIE_SECRET=your-secret-here

   # Songs source
   SONGS_JSON_URL=https://raw.githubusercontent.com/KidCrippler/songs/master/songs.json

   # Admin users (format: user1:pass1,user2:pass2)
   ADMIN_USERS=admin:yourpassword
   ```

4. Generate a real cookie secret:
   ```bash
   openssl rand -hex 32
   ```
   Copy the output and replace `your-secret-here` in the `.env` file.

### Run Locally

```bash
# Terminal 1: Backend
cd platform/backend
npm install
npm run dev

# Terminal 2: Frontend
cd platform/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3001`.

---

## Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will detect multiple services; choose to configure manually

### Step 2: Configure Backend Service

1. Click **"Add Service"** → **"GitHub Repo"**
2. Select your repository
3. In the service settings:
   - **Root Directory**: `platform/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 3: Add Persistent Volume

⚠️ **Critical for SQLite persistence!**

1. Click on your backend service
2. Go to **Settings** → **Volumes**
3. Click **"Add Volume"**
4. Set:
   - **Mount Path**: `/app/database`
   - **Size**: 1GB (or as needed)

### Step 4: Set Environment Variables

In the backend service, go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_PATH` | `/app/database/singalong.db` |
| `COOKIE_SECRET` | `<your-generated-secret>` |
| `SONGS_JSON_URL` | `https://raw.githubusercontent.com/KidCrippler/songs/master/songs.json` |
| `ADMIN_USERS` | `admin:<your-secure-password>` |
| `CORS_ORIGIN` | `https://new.yousing.live,http://localhost:5173,http://localhost:5174` |

> ⚠️ **Do NOT set `PORT`** — Railway automatically assigns and injects the port. Your app reads it from `process.env.PORT`.

> 💡 Generate `COOKIE_SECRET` with: `openssl rand -hex 32`

> 💡 **CORS_ORIGIN** supports multiple origins separated by commas. Include `localhost` origins if you want to test against production backend from your local machine.

### Step 5: Deploy

1. Railway will auto-deploy on push to main branch
2. Wait for the build to complete
3. Note your Railway URL (e.g., `singwithalon-backend-production.up.railway.app`)

### Step 6: (Optional) Custom Backend Domain

If you want `api.yousing.live` instead of Railway's URL:

1. Go to **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter: `api.yousing.live`
4. Railway will show you DNS records to add at name.com

---

## Frontend Deployment (Vercel)

### Step 1: Import Project

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository

### Step 2: Configure Project

1. **Framework Preset**: Vite (auto-detected)
2. **Root Directory**: Click "Edit" and set to `platform/frontend`
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `dist` (default)

### Step 3: Set Environment Variables

Add these in the **Environment Variables** section:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://singwithalon-backend-production.up.railway.app` |
| `VITE_SOCKET_URL` | `https://singwithalon-backend-production.up.railway.app` |

> 💡 Replace with your actual Railway URL (or `https://api.yousing.live` if using custom domain)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Vercel will give you a URL like `your-project.vercel.app`

---

## Custom Domain Setup

### Configure `new.yousing.live` for Frontend (Vercel)

#### In Vercel:

1. Go to your project → **Settings** → **Domains**
2. Click **"Add"**
3. Enter: `new.yousing.live`
4. Vercel will show you the required DNS configuration

#### In name.com:

1. Log in to [name.com](https://www.name.com)
2. Go to **My Domains** → **yousing.live** → **DNS Records**
3. Add a **CNAME** record:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `new` | `cname.vercel-dns.com` | 300 |

4. Wait for DNS propagation (5 minutes to 48 hours, usually fast)

#### Verify in Vercel:

1. Go back to Vercel Domains settings
2. The domain should show a green checkmark when configured correctly

### (Optional) Configure `api.yousing.live` for Backend (Railway)

#### In Railway:

1. Go to your backend service → **Settings** → **Domains**
2. Add custom domain: `api.yousing.live`
3. Note the CNAME target Railway provides

#### In name.com:

Add a **CNAME** record:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `api` | `<railway-provided-target>` | 300 |

Then update your Vercel environment variables to use `https://api.yousing.live`.

---

## Post-Deployment Verification

### 1. Test Backend

```bash
# Check API is responding
curl https://your-railway-url.up.railway.app/api/songs

# Check auth endpoint
curl https://your-railway-url.up.railway.app/api/auth/me
```

### 2. Test Frontend

1. Open `https://new.yousing.live` in a browser
2. Verify the song list loads
3. Test admin login with your credentials
4. Check WebSocket connection (real-time features should work)

### 3. Verify Custom Domain

```bash
# Check DNS resolution
dig new.yousing.live

# Check HTTPS is working
curl -I https://new.yousing.live
```

---

## Troubleshooting

### CORS Errors

**Symptom**: Browser console shows "Access to fetch at ... has been blocked by CORS policy"

**Fix**: 
1. Verify `CORS_ORIGIN` is set correctly in Railway (must match your frontend domain exactly, including `https://`)
2. For multiple origins, use comma-separated values: `https://new.yousing.live,http://localhost:5173`
3. Redeploy the backend after changing environment variables

### WebSocket Connection Failed

**Symptom**: Real-time features don't work, console shows WebSocket errors

**Fix**:
1. Ensure `VITE_SOCKET_URL` points to the correct backend URL
2. Check that Socket.io CORS is configured (same as HTTP CORS)

### Cookies Not Working (Login Issues)

**Symptom**: Can't stay logged in, auth state resets on refresh

**Fix**:
1. Ensure cookie settings have `sameSite: 'none'` and `secure: true` in production
2. Both frontend and backend must use HTTPS
3. Check browser console for cookie warnings

### Database Not Persisting

**Symptom**: Data is lost after redeploy

**Fix**:
1. Verify Railway volume is mounted at `/app/database`
2. Verify `DATABASE_PATH` is set to `/app/database/singalong.db`
3. Check Railway logs for database initialization messages

### DNS Not Resolving

**Symptom**: `new.yousing.live` shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Fix**:
1. Wait for DNS propagation (can take up to 48 hours)
2. Verify CNAME record is set correctly in name.com
3. Use `dig new.yousing.live` to check DNS status

---

## Environment Variables Summary

### Backend (Railway)

```env
# Do NOT set PORT - Railway auto-assigns it
NODE_ENV=production
HOST=0.0.0.0
DATABASE_PATH=/app/database/singalong.db
COOKIE_SECRET=<openssl rand -hex 32>
SONGS_JSON_URL=https://raw.githubusercontent.com/KidCrippler/songs/master/songs.json
ADMIN_USERS=admin:<secure-password>
CORS_ORIGIN=https://new.yousing.live,http://localhost:5173,http://localhost:5174
```

### Backend (Local Development)

```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
DATABASE_PATH=../database/singalong.db
COOKIE_SECRET=<openssl rand -hex 32>
SONGS_JSON_URL=https://raw.githubusercontent.com/KidCrippler/songs/master/songs.json
ADMIN_USERS=admin:<your-password>
# CORS_ORIGIN not needed locally - defaults to localhost origins
```

### Frontend (Vercel)

```env
VITE_API_URL=https://api.yousing.live
VITE_SOCKET_URL=https://api.yousing.live
```

(Or use Railway's default URL if not using custom domain for backend)

---

## Deployment Checklist

- [ ] Railway backend service created
- [ ] Railway volume mounted at `/app/database`
- [ ] Railway environment variables set
- [ ] Backend deployed and responding
- [ ] Vercel frontend project created
- [ ] Vercel root directory set to `platform/frontend`
- [ ] Vercel environment variables set
- [ ] Frontend deployed and loading
- [ ] CNAME record added for `new.yousing.live` in name.com
- [ ] Custom domain verified in Vercel
- [ ] (Optional) Custom domain for backend API
- [ ] End-to-end test: login, view songs, real-time sync

