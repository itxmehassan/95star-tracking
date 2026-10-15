# 95 STAR Tracking - Free Deployment Guide
## Hybrid Architecture: Vercel (Frontend) + Render (Backend)

This deployment architecture gives you **100% free hosting** without requiring Google Cloud billing or paid Firebase subscriptions.

- **Frontend (Vercel)**: Global CDN hosting for high speed, instant SSL, and automatic branch previews.
- **Backend (Render)**: Persistent Node.js/Express service that natively supports real-time Server-Sent Events (SSE) live tracking streams, email dispatch, and JSON database persistence.

---

### Step 1: Deploy Backend to Render (Free Tier)

1. Sign up for a free account at [Render.com](https://render.com) (no credit card required).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub/Git repository.
4. Configure the Web Service settings:
   - **Name**: `star-tracking-backend` (or any name you prefer)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
5. In the **Environment Variables** section, add:
   - `NODE_ENV`: `production`
   - `DISABLE_FIRESTORE`: `true`
   - `ALLOWED_ORIGIN`: `*` (or your Vercel URL once deployed)
   - `ADMIN_EMAIL`: `hassanmehdi1444@gmail.com`
   - `ADMIN_PASSWORD`: your admin password
   - `APP_URL`: your frontend URL (e.g. `https://your-project.vercel.app`)
   - `RESEND_API_KEY`: *(Optional)* your free Resend key if you want email delivery
   - `RESEND_FROM_EMAIL`: `95 Star Tracking <onboarding@resend.dev>`
6. Click **Create Web Service**.
7. Once deployed, copy your Render Web Service URL (e.g. `https://star-tracking-backend.onrender.com`).

> **Health Check Verification**: Open `https://your-render-url.onrender.com/api/db/health` in your browser. You should receive `{"status":"ok", ...}` with all your rides and fleet loaded.

---

### Step 2: Deploy Frontend to Vercel (Free Tier)

1. Sign up for a free account at [Vercel.com](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your Git repository.
4. Vercel will automatically detect the **Vite** framework from `vercel.json`.
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (or `vite build`)
   - **Output Directory**: `dist`
5. Expand the **Environment Variables** section and add:
   - `VITE_API_URL`: Paste your Render backend URL from Step 1 (e.g. `https://star-tracking-backend.onrender.com`)
6. Click **Deploy**.
7. Once deployment finishes, Vercel gives you your production URL (e.g. `https://your-project.vercel.app`).

---

### Step 3: Connect Frontend URL to Backend

1. In Render, go to your Web Service $\rightarrow$ **Environment**.
2. Update `APP_URL` to your Vercel URL (e.g. `https://your-project.vercel.app`).
   *(This ensures that tracking links sent in emails point directly to your Vercel site).*
3. (Optional) Set `ALLOWED_ORIGIN` to your Vercel URL (e.g. `https://your-project.vercel.app`) for strict CORS security.

---

### How Data Persistence & Real-time Live Tracking Work

- **Real-Time Live Tracking**: The driver and passenger tracking pages connect via Server-Sent Events (SSE) to Render. When a driver clicks "On The Way" or "Arrived", the passenger screen updates live with zero latency.
- **Data Persistence**: All rides and drivers are saved automatically to `data/rides_db.json`. In addition, your browser maintains a client-side vault in LocalStorage and automatically syncs with the server whenever the dashboard opens (`/api/sync/hydrate`), ensuring your data is never lost even if a free instance reboots.
- **Zero Firebase Dependency**: Google Cloud Firestore is safely bypassed when `DISABLE_FIRESTORE=true`, eliminating any billing prompts.
