import type { Project, Article, Service, SystemMetric } from './types';

export const fallbackProjects: Project[] = [
  {
    id: 'p1',
    title: 'Aetherial Cloud Gateway',
    slug: 'aetherial-cloud-gateway',
    client: 'FinEdge Global Holdings',
    tagline: 'Ultra-low latency edge orchestration processing 45M requests/day',
    description: 'Designed and deployed a distributed edge computing mesh utilizing Astro Islands, Strapi v5 as the headless content governor, and Supabase transactional pooling with automated zero-downtime canary deployments.',
    category: 'Cloud Architecture',
    techStack: ['Astro v5', 'Strapi v5', 'Supabase', 'PostgreSQL', 'Vercel Edge', 'Tailwind CSS'],
    metrics: {
      latency: '<12ms',
      uptime: '99.995%',
      requestsPerDay: '45M',
    },
    featured: true,
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    externalUrl: 'https://github.com/eka0789',
  },
  {
    id: 'p2',
    title: 'Nexus Autonomous Data Fabric',
    slug: 'nexus-data-fabric',
    client: 'OmniTech Logistics',
    tagline: 'Real-time streaming pipeline and analytics lakehouse with micro-frontend portal',
    description: 'Consolidated legacy silos into a reactive headless data fabric. Features automated cache invalidation webhooks between Strapi CMS and Astro on Vercel with instant preview revalidation.',
    category: 'AI Platform',
    techStack: ['Astro', 'TypeScript', 'Strapi', 'Supabase Vector', 'Redis', 'Vercel'],
    metrics: {
      dataProcessed: '1.2PB/mo',
      costReduction: '42%',
      querySpeedup: '8.4x',
    },
    featured: true,
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    externalUrl: 'https://github.com/eka0789',
  },
  {
    id: 'p3',
    title: 'Lumina Sovereign Micro-Services',
    slug: 'lumina-sovereign-mesh',
    client: 'GovTech Digital Transformation',
    tagline: 'Compliant, resilient enterprise platform with zero-trust RBAC architecture',
    description: 'End-to-end solution combining strict schema validations, encrypted Postgres at rest via Supabase, and a high-performance content delivery frontend for civic digital operations.',
    category: 'Enterprise Portal',
    techStack: ['Astro', 'Strapi CMS', 'Supabase Auth', 'Docker', 'PostgreSQL'],
    metrics: {
      auditScore: '100%',
      activeUsers: '250K+',
      ttfb: '38ms',
    },
    featured: false,
    coverUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    externalUrl: 'https://github.com/eka0789',
  },
  {
    id: 'p4',
    title: 'Hyperion Quantum Exchange',
    slug: 'hyperion-quantum-exchange',
    client: 'Apex Capital Partners',
    tagline: 'Institutional digital asset gateway with real-time risk simulation',
    description: 'Engineered a mission-critical platform handling sub-millisecond execution feeds. Utilized Astro serverless endpoints on Vercel alongside decoupled Strapi content governance.',
    category: 'Fintech Solution',
    techStack: ['Astro SSR', 'WebSockets', 'Supabase Realtime', 'Tailwind', 'Vercel Serverless'],
    metrics: {
      latency: '2.4ms',
      uptime: '99.999%',
      activeUsers: '80K+',
    },
    featured: false,
    coverUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',
    externalUrl: 'https://github.com/eka0789',
  }
];

export const fallbackArticles: Article[] = [
  {
    id: 'a1',
    title: 'Architecting Zero-Overhead Edge Frontends with Astro Islands & Strapi v5',
    slug: 'architecting-zero-overhead-edge-frontends',
    excerpt: 'How selective hydration, partial prerendering, and Headless CMS webhooks deliver sub-50ms TTFB across 300+ global edge locations.',
    content: `
## The Modern Edge Architecture Paradigm

Traditional monolithic frameworks ship megabytes of hydration code before displaying interactive primitives. In this architectural breakdown, we analyze why combining Astro Islands with Strapi Headless CMS backed by Supabase PostgreSQL represents the ultimate sweet spot for modern enterprise applications.

### 1. The Island Architecture Advantage
Astro extracts static HTML at build time, hydrating only interactive components through \`client:visible\` or \`client:idle\` directives. This shrinks JavaScript payloads by up to 90%, yielding pristine Core Web Vitals and instant First Contentful Paint.

### 2. Strapi as the Enterprise Governance Layer
Strapi decouples authoring workflows from rendering performance. By implementing automated Vercel Deploy Hooks on \`entry.publish\` events, content managers get instantaneous live preview without triggering costly full-rebuild overhead.

### 3. Supabase High-Throughput Pooling
With connection pooling (Supavisor) configured on port 6543, serverless functions can scale horizontally to thousands of instances without saturating database connection limits.
    `,
    category: 'Architecture',
    author: 'Eka Prasetyo',
    readingTime: '6 min read',
    tags: ['Astro', 'Strapi', 'Edge Computing', 'Performance'],
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    publishedAt: '2026-08-15',
  },
  {
    id: 'a2',
    title: 'Supabase Transaction Pooling & Postgres Optimization for High-Concurrency CMS',
    slug: 'supabase-transaction-pooling-strapi',
    excerpt: 'Deep dive into Supavisor, connection pooling, and SSL tuning for node-postgres in serverless and containerized deployments.',
    content: `
## Concurrency in Serverless & Container Environments

When scaling Strapi across multi-instance clusters, database connection exhaustion is the primary bottleneck. By routing traffic through Supabase connection pooler on port 6543 using transaction mode, we achieve thousands of concurrent queries with bounded memory footprints.

### Key Strategies
- Connection Pool Sizing (min 2, max 10 per container instance)
- SSL configuration with rejectUnauthorized: false when utilizing managed proxy endpoints
- Prepared statements lifecycle management across ephemeral environments
    `,
    category: 'Database Engineering',
    author: 'Eka Prasetyo',
    readingTime: '8 min read',
    tags: ['Supabase', 'PostgreSQL', 'DevOps', 'Database'],
    coverUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    publishedAt: '2026-08-28',
  },
  {
    id: 'a3',
    title: 'Automating Multi-Stage CI/CD to Vercel with Infrastructure as Code',
    slug: 'automating-multistage-cicd-vercel',
    excerpt: 'A pragmatic guide to preview environments, synthetic audits, and automated zero-downtime rollouts using GitHub Actions.',
    content: `
## Continuous Delivery at Scale

Modern web architectures require strict gatekeeping. This blueprint covers GitHub Actions workflows that execute linting, typechecking, Lighthouse audits, and automatic Vercel branch previews on every pull request.

### Pipeline Stages
1. **Static Analysis**: TypeScript validation + Astro Check
2. **Security Scan**: SAST vulnerability inspection on dependencies
3. **Vercel Edge Preview**: Ephemeral URL generation with comment injection into PRs
4. **Production Canary**: Zero-downtime traffic migration upon master merge
    `,
    category: 'DevOps',
    author: 'Eka Prasetyo',
    readingTime: '5 min read',
    tags: ['Vercel', 'CI/CD', 'Automation', 'GitHub Actions'],
    coverUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1200&q=80',
    featured: false,
    publishedAt: '2026-09-01',
  }
];

export const fallbackServices: Service[] = [
  {
    id: 's1',
    name: 'Enterprise Cloud & Edge Architecture',
    slug: 'cloud-edge-architecture',
    tagline: 'Scalable, fault-tolerant cloud blueprints optimized for latency and cost',
    description: 'End-to-end infrastructure planning from multi-region edge caching to serverless container orchestration, infrastructure-as-code, and cloud governance.',
    icon: 'cloud',
    deliverables: [
      'Zero-Trust Security Mesh',
      'Multi-Region Edge Topology',
      'Vercel Edge & Supabase Integration',
      'Cost Optimization Audit'
    ],
    order: 1,
  },
  {
    id: 's2',
    name: 'Headless CMS & DXP Ecosystems',
    slug: 'headless-cms-dxp',
    tagline: 'Composable digital experiences powered by Strapi v5 and high-speed Astro frontends',
    description: 'Custom schema modeling, webhook event pipelines, role-based workflows, and automated instant static rendering.',
    icon: 'layout',
    deliverables: [
      'Custom Strapi API Models',
      'Content Workflow Pipelines',
      'Webhook-driven Incremental Builds',
      'Localization & Asset CDN'
    ],
    order: 2,
  },
  {
    id: 's3',
    name: 'High-Concurrency Database Systems',
    slug: 'database-systems',
    tagline: 'PostgreSQL tuning, transaction pooling, and distributed real-time replicas',
    description: 'Specialized Supabase PostgreSQL configurations, query indexing, pgvector integration, and migration strategies.',
    icon: 'database',
    deliverables: [
      'PgBouncer & Supavisor Setup',
      'Row Level Security (RLS) Auditing',
      'Automated Backup Runbooks',
      'High Throughput Indexing'
    ],
    order: 3,
  }
];

export const architectureMetrics: SystemMetric[] = [
  {
    label: 'Global Edge TTFB',
    value: '< 28ms',
    description: 'Vercel Edge Network spanning 300+ PoPs worldwide',
    badge: 'Blazing Fast',
    trend: '99.9% Cache Hit',
  },
  {
    label: 'Payload Optimization',
    value: '0 KB',
    description: 'Default zero-JS baseline until island activation',
    badge: 'Astro Islands',
    trend: '94% Reduction',
  },
  {
    label: 'Postgres Throughput',
    value: '10K+ QPS',
    description: 'Supabase Transaction Pooler (Supavisor)',
    badge: 'Highly Scalable',
    trend: 'Zero Connection Starvation',
  },
  {
    label: 'Content Revalidation',
    value: '< 1.2s',
    description: 'Strapi Webhook to Vercel Deploy Hook & On-Demand ISR',
    badge: 'Real-time CMS',
    trend: 'Instant Live Content',
  }
];
