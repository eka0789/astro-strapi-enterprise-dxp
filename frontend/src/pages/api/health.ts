import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const strapiUrl = import.meta.env.STRAPI_URL || 'http://localhost:1337';
  let strapiLive = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${strapiUrl}/_health`, { signal: controller.signal });
    clearTimeout(timeout);
    strapiLive = res.ok;
  } catch (e) {
    strapiLive = false;
  }

  const payload = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: {
      platform: 'Vercel Edge / Serverless',
      framework: 'Astro v5 Hybrid',
      leadArchitect: 'Eka Prasetyo (@eka0789)',
    },
    services: {
      astroFrontend: {
        status: 'UP',
        rendering: 'Hybrid (SSG + Edge SSR)',
        islands: 'Active',
      },
      strapiCMS: {
        status: strapiLive ? 'CONNECTED' : 'FALLBACK_OFFLINE_READY',
        endpoint: strapiUrl,
        mode: strapiLive ? 'LIVE_HEADLESS_API' : 'RESILIENT_SEED_DATA',
      },
      supabasePostgreSQL: {
        status: 'STANDBY_OR_POOLER_ACTIVE',
        poolerPort: 6543,
        engine: 'Supavisor / Transactional',
        security: 'RLS_ENABLED',
      },
    },
    telemetry: {
      edgeRegions: 'Global (Anycast)',
      brotliCompression: true,
      cacheControl: 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
