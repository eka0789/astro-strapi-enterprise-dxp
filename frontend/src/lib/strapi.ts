import type { Project, Article, Service } from './types';
import { fallbackProjects, fallbackArticles, fallbackServices } from './mock-data';

// Support both Astro standard (PUBLIC_*) and Next/Vercel standard (NEXT_PUBLIC_*) env keys
const SUPABASE_URL = 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_KEY = 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';

const STRAPI_URL = import.meta.env.STRAPI_URL || process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = import.meta.env.STRAPI_TOKEN || process.env.STRAPI_TOKEN || '';

async function fetchFromSupabase<T>(table: string): Promise<T[] | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const cleanUrl = SUPABASE_URL.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Supabase] Request to table "${table}" returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err: any) {
    console.warn(`[Supabase] Fetch error for "${table}":`, err.message);
    return null;
  }
}

async function fetchFromStrapi<T>(endpoint: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (STRAPI_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
    }

    const res = await fetch(`${STRAPI_URL}/api/${endpoint}`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getProjects(): Promise<{ projects: Project[]; source: 'supabase' | 'strapi' | 'fallback' }> {
  // 1. Priority 1: Supabase Live Database
  const supaData = await fetchFromSupabase<any>('projects');
  if (supaData && supaData.length > 0) {
    const mapped: Project[] = supaData.map((item) => ({
      id: String(item.id),
      title: item.title,
      slug: item.slug,
      client: item.client || 'Enterprise Client',
      tagline: item.tagline || '',
      description: item.description || '',
      category: item.category || 'Cloud Architecture',
      techStack: Array.isArray(item.tech_stack) ? item.tech_stack : (item.techStack || ['Astro', 'Supabase']),
      metrics: item.metrics || {},
      featured: Boolean(item.featured),
      coverUrl: item.cover_url || item.coverUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      externalUrl: item.external_url || item.externalUrl || 'https://github.com/eka0789',
    }));
    return { projects: mapped, source: 'supabase' };
  }

  // 2. Priority 2: Strapi Headless CMS API
  const strapiData = await fetchFromStrapi<any>('projects?populate=*');
  if (strapiData && strapiData.data && strapiData.data.length > 0) {
    const mapped: Project[] = strapiData.data.map((item: any) => ({
      id: String(item.id),
      title: item.attributes.title,
      slug: item.attributes.slug,
      client: item.attributes.client || 'Enterprise Client',
      tagline: item.attributes.tagline || '',
      description: item.attributes.description || '',
      category: item.attributes.category || 'Cloud Architecture',
      techStack: Array.isArray(item.attributes.techStack) ? item.attributes.techStack : ['Astro', 'Strapi'],
      metrics: item.attributes.metrics || {},
      featured: Boolean(item.attributes.featured),
      coverUrl: item.attributes.coverUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      externalUrl: item.attributes.externalUrl || 'https://github.com/eka0789',
    }));
    return { projects: mapped, source: 'strapi' };
  }

  // 3. Resilient Fallback
  return { projects: fallbackProjects, source: 'fallback' };
}

export async function getArticles(): Promise<{ articles: Article[]; source: 'supabase' | 'strapi' | 'fallback' }> {
  // 1. Priority 1: Supabase Live Database
  const supaData = await fetchFromSupabase<any>('articles');
  if (supaData && supaData.length > 0) {
    const mapped: Article[] = supaData.map((item) => ({
      id: String(item.id),
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      content: item.content || '',
      category: item.category || 'Architecture',
      author: item.author || 'Eka Prasetyo',
      readingTime: item.reading_time || item.readingTime || '5 min read',
      tags: Array.isArray(item.tags) ? item.tags : ['Tech'],
      coverUrl: item.cover_url || item.coverUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      featured: Boolean(item.featured),
      publishedAt: item.created_at || item.publishedAt,
    }));
    return { articles: mapped, source: 'supabase' };
  }

  // 2. Priority 2: Strapi Headless CMS API
  const strapiData = await fetchFromStrapi<any>('articles?populate=*');
  if (strapiData && strapiData.data && strapiData.data.length > 0) {
    const mapped: Article[] = strapiData.data.map((item: any) => ({
      id: String(item.id),
      title: item.attributes.title,
      slug: item.attributes.slug,
      excerpt: item.attributes.excerpt || '',
      content: item.attributes.content || '',
      category: item.attributes.category || 'Architecture',
      author: item.attributes.author || 'Eka Prasetyo',
      readingTime: item.attributes.readingTime || '5 min read',
      tags: Array.isArray(item.attributes.tags) ? item.attributes.tags : ['Tech'],
      coverUrl: item.attributes.coverUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      featured: Boolean(item.attributes.featured),
      publishedAt: item.attributes.publishedAt,
    }));
    return { articles: mapped, source: 'strapi' };
  }

  // 3. Resilient Fallback
  return { articles: fallbackArticles, source: 'fallback' };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { articles } = await getArticles();
  return articles.find((a) => a.slug === slug) || null;
}

export async function getServices(): Promise<{ services: Service[]; source: 'supabase' | 'strapi' | 'fallback' }> {
  // 1. Priority 1: Supabase Live Database
  const supaData = await fetchFromSupabase<any>('services');
  if (supaData && supaData.length > 0) {
    const mapped: Service[] = supaData.map((item) => ({
      id: String(item.id),
      name: item.name,
      slug: item.slug,
      tagline: item.tagline || '',
      description: item.description || '',
      icon: item.icon || 'cloud',
      deliverables: Array.isArray(item.deliverables) ? item.deliverables : [],
      order: item.sort_order || item.order || 1,
    }));
    return { services: mapped, source: 'supabase' };
  }

  // 2. Priority 2: Strapi Headless CMS API
  const strapiData = await fetchFromStrapi<any>('services?populate=*');
  if (strapiData && strapiData.data && strapiData.data.length > 0) {
    const mapped: Service[] = strapiData.data.map((item: any) => ({
      id: String(item.id),
      name: item.attributes.name,
      slug: item.attributes.slug,
      tagline: item.attributes.tagline || '',
      description: item.attributes.description || '',
      icon: item.attributes.icon || 'cloud',
      deliverables: Array.isArray(item.attributes.deliverables) ? item.attributes.deliverables : [],
      order: item.attributes.order || 1,
    }));
    return { services: mapped, source: 'strapi' };
  }

  // 3. Resilient Fallback
  return { services: fallbackServices, source: 'fallback' };
}
