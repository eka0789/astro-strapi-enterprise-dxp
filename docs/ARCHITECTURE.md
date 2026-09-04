# NovaSphere Architecture & System Design Specification

**Architect:** Eka Prasetyo (`@eka0789`)  
**Role:** Senior Fullstack Engineer & Solution Architect  
**Tech Stack:** Astro v5, Strapi Headless CMS v5, Supabase (PostgreSQL 15+ with Supavisor), Vercel Global Edge Network, Tailwind CSS  

---

## 1. Executive Summary & Problem Statement

Modern enterprise web portals often struggle to balance three opposing forces (the *Frontend Performance Trilemma*):
1. **Instant First Contentful Paint (FCP) and low Time to First Byte (TTFB)** for global audiences.
2. **Dynamic Editorial Governance** allowing content managers to create, edit, and publish rich content without technical bottlenecks or site rebuild freezes.
3. **Transactional Integrity & Concurrency** ensuring complex relational queries, role-based permissions, and user data stay resilient under heavy traffic bursts.

NovaSphere resolves this trilemma by decoupling authoring workflows from edge rendering, orchestrating an event-driven loop between **Strapi v5**, **Supabase PostgreSQL**, and **Astro v5** deployed on **Vercel Edge Network**.

---

## 2. System Architecture Topology

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

## 3. Data Flow & Cache Invalidation Lifecycle

1. **Content Authoring**:
   An editor updates an Article or Project inside Strapi CMS and clicks `Publish`.
2. **Database Persistence**:
   Strapi writes the record to Supabase PostgreSQL over an encrypted TLS connection pooler.
3. **Webhook Dispatch**:
   Strapi fires an automated webhook payload to Vercel Deploy Hook / On-demand Revalidation API.
4. **Edge Cache Eviction**:
   Vercel invalidates the affected route paths instantly. Next request receives newly generated static HTML with zero client hydration overhead.
5. **Client Rendering**:
   End users receive pristine static HTML directly from the closest edge point of presence.

---

## 4. Database Schema Design (Supabase PostgreSQL)

### Projects Table (`public.projects`)
| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique record identifier (`uuid_generate_v4()`) |
| `title` | VARCHAR(255) | Case study title |
| `slug` | VARCHAR(255) | Unique SEO-friendly slug |
| `client` | VARCHAR(255) | Enterprise client name |
| `tagline` | VARCHAR(255) | One-line value proposition |
| `description` | TEXT | Architectural summary |
| `category` | VARCHAR(100) | Solution category |
| `tech_stack` | JSONB | Array of technology tags |
| `metrics` | JSONB | Telemetry benchmarks (latency, uptime, QPS) |
| `featured` | BOOLEAN | Homepage showcase flag |
| `cover_url` | TEXT | CDN asset URL |
| `external_url` | TEXT | GitHub or live deployment URL |

### Articles Table (`public.articles`)
| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique record identifier |
| `title` | VARCHAR(255) | Technical article title |
| `slug` | VARCHAR(255) | Unique URL slug |
| `excerpt` | TEXT | SEO preview excerpt |
| `content` | TEXT | Markdown / Richtext content |
| `category` | VARCHAR(100) | Domain classification |
| `author` | VARCHAR(150) | Author attribution |
| `reading_time` | VARCHAR(50) | Estimated reading duration |
| `tags` | JSONB | Keyword tags array |
| `cover_url` | TEXT | Header banner image |
| `featured` | BOOLEAN | Highlighted article flag |

---

## 5. Security & Compliance Strategy

- **Row Level Security (RLS)**: Public client access is strictly constrained to `SELECT` on published entities. Administrative mutations require authenticated service role keys.
- **Strict Content Security Policy (CSP)**: Injected via `vercel.json` and Astro middleware.
- **Environment Isolation**: Production database credentials, JWT secrets, and API tokens are passed through encrypted environment variables.
- **Resilient Fallback Design**: If the Strapi CMS endpoint experiences downtime or latency spikes, Astro's resilient fallback layer gracefully serves pre-compiled offline seed data, ensuring zero user-facing 500 errors.
