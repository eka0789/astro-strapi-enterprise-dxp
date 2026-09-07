import type { APIRoute } from 'astro';
import { getArticles } from '../lib/strapi';
import type { Article } from '../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ site, url }) => {
  const baseUrl = site ? site.toString() : `${url.protocol}//${url.host}`;
  const { articles } = await getArticles();

  const staticPages = [
    '',
    '/architecture',
    '/projects',
    '/blog',
  ];

  const staticEntries = staticPages
    .map(
      (path) => `
    <url>
      <loc>${baseUrl}${path}</loc>
      <changefreq>daily</changefreq>
      <priority>${path === '' ? '1.0' : '0.8'}</priority>
    </url>`
    )
    .join('');

  const articleEntries = articles
    .map(
      (article: Article) => `
    <url>
      <loc>${baseUrl}/blog/${article.slug}</loc>
      <lastmod>${article.publishedAt || new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>`
    )
    .join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticEntries}
  ${articleEntries}
</urlset>`;

  return new Response(sitemap.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
