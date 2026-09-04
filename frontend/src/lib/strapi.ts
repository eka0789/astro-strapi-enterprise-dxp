import type { Project, Article, Service } from './types';
import { fallbackProjects, fallbackArticles, fallbackServices } from './mock-data';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = import.meta.env.STRAPI_TOKEN || '';

interface StrapiResponse<T> {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

async function fetchFromStrapi<T>(endpoint: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Fast 2s timeout

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

    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    return json;
  } catch (error) {
    // Graceful offline fallback
    return null;
  }
}

export async function getProjects(): Promise<{ projects: Project[]; source: 'strapi' | 'fallback' }> {
  const data = await fetchFromStrapi<StrapiResponse<any>>('projects?populate=*');
  if (data && data.data && data.data.length > 0) {
    const mapped: Project[] = data.data.map((item) => ({
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
  return { projects: fallbackProjects, source: 'fallback' };
}

export async function getArticles(): Promise<{ articles: Article[]; source: 'strapi' | 'fallback' }> {
  const data = await fetchFromStrapi<StrapiResponse<any>>('articles?populate=*');
  if (data && data.data && data.data.length > 0) {
    const mapped: Article[] = data.data.map((item) => ({
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
  return { articles: fallbackArticles, source: 'fallback' };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { articles } = await getArticles();
  return articles.find((a) => a.slug === slug) || null;
}

export async function getServices(): Promise<{ services: Service[]; source: 'strapi' | 'fallback' }> {
  const data = await fetchFromStrapi<StrapiResponse<any>>('services?populate=*');
  if (data && data.data && data.data.length > 0) {
    const mapped: Service[] = data.data.map((item) => ({
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
  return { services: fallbackServices, source: 'fallback' };
}
