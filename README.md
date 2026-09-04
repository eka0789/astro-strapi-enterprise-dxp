# 🚀 NovaSphere Enterprise DXP Platform

<div align="center">

![NovaSphere Architecture](https://img.shields.io/badge/Architecture-Enterprise%20DXP-06b6d4?style=for-the-badge)
![Astro v5](https://img.shields.io/badge/Astro-v5%20Hybrid-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![Strapi v5](https://img.shields.io/badge/Strapi-Headless%20CMS-4945FF?style=for-the-badge&logo=strapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015+-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel%20Edge-000000?style=for-the-badge&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Engineered by [Eka Prasetyo (@eka0789)](https://github.com/eka0789)**  
*Role: Senior Fullstack Engineer & Solution Architect*

[Live Blueprints](docs/ARCHITECTURE.md) • [Deployment Runbook](docs/DEPLOYMENT_GUIDE.md) • [SQL Migrations](database/supabase-schema.sql) • [GitHub Profile](https://github.com/eka0789)

</div>

---

## 🎯 Project Goal & Architectural Mission

**NovaSphere** is a high-performance, enterprise-grade **Digital Experience Platform (DXP)** reference implementation. It proves how modern web applications can achieve sub-30ms global latency without compromising editorial agility or database concurrency.

### Key Objectives
- **Zero-JS Default Baseline**: Harness **Astro v5 Island Architecture** to output pure static HTML at build time, selectively hydrating components only when visible.
- **Decoupled Content Governance**: Empower marketing and editorial teams with **Strapi Headless CMS v5**, maintaining custom content types for case studies, publications, and architectural services.
- **High-Throughput Relational Storage**: Anchor persistence on **Supabase PostgreSQL**, tuned with **Supavisor Transaction Connection Pooling** (10,000+ QPS capacity) and Row-Level Security (RLS).
- **Edge Deployment**: Full **Vercel** serverless & edge infrastructure with automatic deploy hooks for instant content invalidation.
- **Fault-Tolerant Resilient Fallback**: If the CMS is offline or unreachable during cold starts, the frontend automatically falls back to an embedded seed data layer—guaranteeing 100% uptime with zero 500 error cascades.

---

## 🏗️ System Architecture Topology

```
+-----------------------------------------------------------------------------------+
|                              Global Client Traffic                                |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Vercel Global Edge Network (300+ PoPs)                     |
|  - Anycast DNS Routing                 - Brotli Compression                       |
|  - Edge Middleware Security Headers    - Sub-30ms Global TTFB                     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                      Astro v5 Hybrid Island Architecture                          |
|  - Static HTML Generated at Build Time (Zero-JS baseline)                         |
|  - Partial Prerendering: On-Demand SSR for dynamic routes                         |
|  - Selective Island Hydration (client:visible, client:idle)                       |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
    (Read-Only Content API)                   (Vercel Deploy Hook Trigger)
                    v                                       ^
+-----------------------------------------+                 |
|       Strapi v5 Headless CMS            |                 |
|  - Content Management Studio (Admin UI) |                 |
|  - Custom Schemas: Project, Article,    |                 |
|    Service, Category, Settings          |                 |
|  - Event Webhook Dispatcher ------------+-----------------+
+-------------------+---------------------+
                    |
          (SQL Transaction Pooler)
          (Port 6543 / Supavisor)
                    v
+-----------------------------------------------------------------------------------+
|                       Supabase PostgreSQL 15+ Cloud Engine                         |
|  - High-Concurrency Supavisor Pooling (10,000+ QPS)                              |
|  - Row Level Security (RLS) policies                                              |
|  - JSONB attributes for flexible metadata & metrics                               |
|  - Automated point-in-time recovery & ACID consistency                            |
+-----------------------------------------------------------------------------------+
```

---

## ⚡ Tech Stack & Technologies

| Domain | Technology | Key Capabilities |
|---|---|---|
| **Frontend Framework** | **Astro v5** | Hybrid Island Architecture, Partial Prerendering, `@astrojs/vercel` adapter |
| **Styling & UI** | **Tailwind CSS** | Glassmorphism, cybernetic gradients, dark theme, fluid responsive layouts |
| **Headless CMS** | **Strapi v5** | Decoupled authoring, dynamic schemas, RBAC, automated webhooks |
| **Database** | **Supabase PostgreSQL** | PostgreSQL 15+, Supavisor transaction pooler, RLS security policies |
| **Edge & Hosting** | **Vercel** | Edge network, serverless functions, deploy hooks, Brotli compression |
| **Language & Tooling** | **TypeScript** | Strict type contracts across APIs, schemas, and components |

---

## 📂 Repository Structure

```
├── frontend/                     # Astro v5 Frontend Application
│   ├── src/
│   │   ├── components/           # Hero, Navbar, Footer, ProjectCard, ArticleCard, Topology
│   │   ├── layouts/              # Master Layout with ambient glows & meta tags
│   │   ├── lib/                  # Strapi client, mock fallbacks, TypeScript types
│   │   ├── pages/                # Index, Architecture deep dive, Projects, Blog, /api/health
│   │   └── styles/               # Tailwind CSS & custom animation styles
│   ├── astro.config.mjs          # Astro + Tailwind + Vercel adapter config
│   ├── tailwind.config.mjs       # NovaSphere custom design system tokens
│   └── package.json
│
├── backend/                      # Strapi v5 Headless CMS Project
│   ├── config/                   # Database (Supabase pooler), server, admin, security
│   ├── src/api/                  # Custom content models (Project, Article, Service)
│   ├── scripts/                  # Seed script & programmatic fixtures
│   ├── Dockerfile                # Multi-stage production container build
│   └── package.json
│
├── database/                     # Database Migrations
│   └── supabase-schema.sql       # PostgreSQL DDL, RLS policies, and seed records
│
├── docs/                         # Solution Architect Documentation
│   ├── ARCHITECTURE.md           # System design & caching hierarchy
│   └── DEPLOYMENT_GUIDE.md       # Step-by-step Vercel & Supabase guide
│
├── .github/workflows/ci.yml      # Automated GitHub Actions build validation
├── vercel.json                   # Vercel deployment configuration & security headers
├── package.json                  # Monorepo task orchestration
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/eka0789/astro-strapi-enterprise-dxp.git
cd astro-strapi-enterprise-dxp

# Install frontend dependencies
cd frontend && npm install
```

### 2. Run the Astro Frontend (with Embedded Resilient Mock Data)
```bash
npm run dev
```
Open **[http://localhost:4321](http://localhost:4321)** to preview the platform with animations, case studies, and architecture visualizers!

### 3. Setup Supabase & Strapi Backend
```bash
# 1. Execute SQL schema in Supabase SQL Editor:
# database/supabase-schema.sql

# 2. Configure environment variables in backend:
cd ../backend
cp .env.example .env
# Edit .env with your Supabase connection string

# 3. Start Strapi CMS:
npm install
npm run develop
```

---

## 🌐 Deploy to Vercel

1. Push your repository to GitHub (`https://github.com/eka0789/astro-strapi-enterprise-dxp`).
2. Go to **[vercel.com/new](https://vercel.com/new)** and import the repository.
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Astro`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.vercel/output`
4. Set Environment Variables (optional for live Strapi):
   - `STRAPI_URL`: Your live Strapi URL
   - `STRAPI_TOKEN`: Strapi API Token
5. Click **Deploy**. Your enterprise platform is now live on the global edge!

---

## 👨‍💻 Author & Solution Architect

**Eka Prasetyo**  
- GitHub: [@eka0789](https://github.com/eka0789)
- Email: eka0789@gmail.com
- Specialty: Senior Fullstack Engineer & Enterprise Solution Architect

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
