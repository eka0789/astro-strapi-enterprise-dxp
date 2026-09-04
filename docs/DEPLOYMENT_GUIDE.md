# NovaSphere Production Deployment Guide

This guide details step-by-step instructions for deploying NovaSphere to **Vercel** (Astro Frontend) and connecting to **Supabase** (PostgreSQL) and **Strapi** (Headless CMS).

---

## Part 1: Supabase Setup (PostgreSQL Database)

1. **Create a Supabase Project**:
   - Go to [database.new](https://database.new) and create a new project in your preferred region (e.g., `ap-southeast-1` Singapore or `us-east-1`).
2. **Execute Database Migration**:
   - Open the **SQL Editor** in Supabase.
   - Copy the contents of `database/supabase-schema.sql` from this repository.
   - Run the script. This creates the `projects`, `articles`, and `services` tables, enables RLS policies, and inserts seed records.
3. **Get Database Connection String**:
   - Navigate to **Project Settings > Database**.
   - Under **Connection Pooling**, copy the URI (port `6543`, `Transaction` mode).

---

## Part 2: Strapi Headless CMS Setup

1. **Local Development**:
   ```bash
   cd backend
   cp .env.example .env
   # Fill in your Supabase DATABASE_URL or discrete credentials
   npm install
   npm run develop
   ```
2. **First-time Admin Account**:
   - Open `http://localhost:1337/admin` and create the primary administrator account.
3. **Deploying Strapi to Cloud**:
   - Strapi can be deployed using the provided multi-stage `Dockerfile` to services such as **Railway**, **Render**, **Fly.io**, or **AWS ECS**.
   - Configure environment variables matching `backend/.env.example`.

---

## Part 3: Deploying Astro Frontend to Vercel

1. **Import Repository to Vercel**:
   - Go to your [Vercel Dashboard](https://vercel.com).
   - Click **Add New > Project** and select `astro-strapi-enterprise-dxp`.
2. **Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Astro`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.vercel/output`
3. **Environment Variables**:
   - `STRAPI_URL`: URL of your live Strapi CMS instance (e.g. `https://your-strapi-instance.up.railway.app`).
   - `STRAPI_TOKEN`: Read-only API Token generated from Strapi Admin (`Settings > API Tokens`).
4. **Deploy**:
   - Click **Deploy**. Vercel will automatically build the Astro hybrid app and distribute it globally across 300+ edge locations!

---

## Part 4: Automated Content Invalidation (Webhooks)

1. Inside your Strapi Admin panel:
   - Navigate to **Settings > Webhooks > Create new Webhook**.
   - Name: `Vercel Deploy Hook`.
   - URL: Paste your Vercel Deploy Hook URL (found under Vercel Project Settings > Git > Deploy Hooks).
   - Events: Check `entry.publish`, `entry.unpublish`, `entry.update`.
2. Whenever you publish new articles or projects, Vercel will automatically re-render the site with fresh static assets!
