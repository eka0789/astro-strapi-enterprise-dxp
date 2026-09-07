-- =========================================================================
-- NovaSphere Enterprise Schema & Seed Migration for Supabase PostgreSQL
-- Architect: Eka Prasetyo (Senior Fullstack & Solution Architect)
-- =========================================================================

-- Enable UUID extension & pgvector for Semantic Search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Table: Projects (Showcase & Case Studies)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    client VARCHAR(255),
    tagline VARCHAR(255),
    description TEXT,
    category VARCHAR(100) DEFAULT 'Cloud Architecture',
    tech_stack JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    featured BOOLEAN DEFAULT false,
    cover_url TEXT,
    external_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: Articles (Engineering Insights / CMS Blog)
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    category VARCHAR(100) DEFAULT 'Architecture',
    author VARCHAR(150) DEFAULT 'Eka Prasetyo',
    reading_time VARCHAR(50) DEFAULT '5 min read',
    tags JSONB DEFAULT '[]'::jsonb,
    cover_url TEXT,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table: Services (Enterprise Architecture Offerings)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    icon VARCHAR(100),
    deliverables JSONB DEFAULT '[]'::jsonb,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table: Audit Logs (Enterprise SOC2 Compliance & Immutability)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Public Read Policies for Fast Edge Access
CREATE POLICY "Allow public read access on projects"
    ON public.projects FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on articles"
    ON public.articles FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on services"
    ON public.services FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow authenticated audit logging"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

-- 6. Seed Data: Enterprise Showcase
INSERT INTO public.projects (title, slug, client, tagline, description, category, tech_stack, metrics, featured, cover_url, external_url)
VALUES 
(
    'Aetherial Cloud Gateway', 
    'aetherial-cloud-gateway', 
    'Global Fintech Corp', 
    'Ultra-low latency edge orchestration processing 45M requests/day',
    'Designed a distributed multi-region edge mesh topology leveraging Astro Islands, Strapi v5 as the headless content governor, and Supabase transactional pooling with zero downtime deployments.',
    'Cloud Architecture',
    '["Astro v5", "Strapi v5", "Supabase", "PostgreSQL", "Vercel Edge", "Tailwind CSS"]'::jsonb,
    '{"latency": "<12ms", "uptime": "99.995%", "requestsPerDay": "45M"}'::jsonb,
    true,
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    'https://github.com/eka0789'
),
(
    'Nexus Autonomous Data Fabric', 
    'nexus-data-fabric', 
    'OmniTech Industries', 
    'Real-time streaming pipeline and analytics lakehouse with micro-frontend portal',
    'Consolidated legacy silos into a reactive headless data fabric. Features automated cache invalidation webhooks between Strapi CMS and Astro on Vercel.',
    'AI Platform',
    '["Astro", "TypeScript", "Strapi", "Supabase Vector", "Redis", "Vercel"]'::jsonb,
    '{"dataProcessed": "1.2PB/mo", "costReduction": "42%", "querySpeedup": "8.4x"}'::jsonb,
    true,
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://github.com/eka0789'
),
(
    'Lumina Sovereign Micro-Services', 
    'lumina-sovereign-mesh', 
    'GovTech Digital Transformation', 
    'Compliant, resilient enterprise platform with zero-trust RBAC architecture',
    'End-to-end solution combining strict schema validations, encrypted Postgres at rest via Supabase, and a high-performance content delivery frontend.',
    'Enterprise Portal',
    '["Astro", "Strapi CMS", "Supabase Auth", "Docker", "PostgreSQL"]'::jsonb,
    '{"auditScore": "100%", "activeUsers": "250K+", "ttfb": "38ms"}'::jsonb,
    false,
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    'https://github.com/eka0789'
)
ON CONFLICT (slug) DO NOTHING;

-- 7. Seed Data: Engineering Insights
INSERT INTO public.articles (title, slug, excerpt, content, category, author, reading_time, tags, cover_url, featured)
VALUES
(
    'Architecting Zero-Overhead Edge Frontends with Astro Islands & Strapi v5',
    'architecting-zero-overhead-edge-frontends',
    'How selective hydration, partial prerendering, and Headless CMS webhooks deliver sub-50ms TTFB across 300+ global edge locations.',
    '## The Modern Edge Architecture Paradigm\n\nTraditional monolithic frameworks ship megabytes of hydration code before displaying interactive primitives. In this architectural breakdown, we analyze why combining Astro Islands with Strapi Headless CMS backed by Supabase PostgreSQL represents the ultimate sweet spot for modern enterprise applications.\n\n### 1. The Island Architecture Advantage\nAstro extracts static HTML at build time, hydrating only interactive components through `client:visible` or `client:idle` directives. This shrinks JavaScript payloads by up to 90%.\n\n### 2. Strapi as the Enterprise Governance Layer\nStrapi decouples authoring workflows from rendering performance. By implementing automated Vercel Deploy Hooks on `entry.publish` events, content managers get instantaneous live preview without triggering costly full-rebuild overhead.',
    'Architecture',
    'Eka Prasetyo',
    '6 min read',
    '["Astro", "Strapi", "Edge Computing", "Performance"]'::jsonb,
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    true
),
(
    'Supabase Transaction Pooling & Postgres Optimization for High-Concurrency CMS',
    'supabase-transaction-pooling-strapi',
    'Deep dive into Supavisor, connection pooling, and SSL tuning for node-postgres in serverless and containerized deployments.',
    '## Concurrency in Serverless & Container Environments\n\nWhen scaling Strapi across multi-instance clusters, database connection exhaustion is the primary bottleneck. By routing traffic through Supabase connection pooler on port 6543 using transaction mode, we achieve thousands of concurrent queries with bounded memory footprints.',
    'Database Engineering',
    'Eka Prasetyo',
    '8 min read',
    '["Supabase", "PostgreSQL", "DevOps", "Database"]'::jsonb,
    'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    true
),
(
    'Automating Multi-Stage CI/CD to Vercel with Infrastructure as Code',
    'automating-multistage-cicd-vercel',
    'A pragmatic guide to preview environments, synthetic audits, and automated zero-downtime rollouts using GitHub Actions.',
    '## Continuous Delivery at Scale\n\nModern web architectures require strict gatekeeping. This blueprint covers GitHub Actions workflows that execute linting, typechecking, Lighthouse audits, and automatic Vercel branch previews on every pull request.',
    'DevOps',
    'Eka Prasetyo',
    '5 min read',
    '["Vercel", "CI/CD", "Automation", "GitHub Actions"]'::jsonb,
    'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1200&q=80',
    false
)
ON CONFLICT (slug) DO NOTHING;

-- 8. Seed Data: Core Solutions
INSERT INTO public.services (name, slug, tagline, description, icon, deliverables, sort_order)
VALUES
(
    'Enterprise Cloud & Edge Architecture',
    'cloud-edge-architecture',
    'Scalable, fault-tolerant cloud blueprints optimized for latency and cost',
    'End-to-end infrastructure planning from multi-region edge caching to serverless container orchestration, infrastructure-as-code, and cloud governance.',
    'cloud',
    '["Zero-Trust Security Mesh", "Multi-Region Edge Topology", "Vercel Edge & Supabase Integration", "Cost Optimization Audit"]'::jsonb,
    1
),
(
    'Headless CMS & DXP Ecosystems',
    'headless-cms-dxp',
    'Composable digital experiences powered by Strapi v5 and high-speed Astro frontends',
    'Custom schema modeling, webhook event pipelines, role-based workflows, and automated instant static rendering.',
    'database',
    '["Custom Strapi API Models", "Content Workflow Pipelines", "Webhook-driven Incremental Builds", "Localization & Asset CDN"]'::jsonb,
    2
),
(
    'High-Concurrency Database Systems',
    'database-systems',
    'PostgreSQL tuning, transaction pooling, and distributed real-time replicas',
    'Specialized Supabase PostgreSQL configurations, query indexing, pgvector integration, and migration strategies.',
    'server',
    '["PgBouncer & Supavisor Setup", "Row Level Security (RLS) Auditing", "Automated Backup Runbooks", "High Throughput Indexing"]'::jsonb,
    3
)
ON CONFLICT (slug) DO NOTHING;

-- 9. Enterprise Semantic Search & Vector Retrieval Function (pgvector)
-- Matches articles/case studies by cosine distance
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title::text,
    a.slug::text,
    a.content::text,
    1 - (a.tags <-> query_embedding) AS similarity
  FROM public.articles a
  WHERE 1 - (a.tags <-> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
