import type { APIRoute } from 'astro';
import { getPublishedProjects } from '../lib/directus';
import { getWebsiteContent } from '../lib/website-content';
import { llmsTxt } from '../lib/seo.mjs';
import { localizeProject } from '../lib/project-locale.mjs';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const [es, en, projects] = await Promise.all([getWebsiteContent('es'), getWebsiteContent('en'), getPublishedProjects()]);
  const list = (locale: 'es' | 'en') => projects.map((p) => localizeProject(p, locale)).map((p: { slug: string; title: string }) => ({ slug: p.slug, title: p.title }));
  const body = llmsTxt({
    origin: site ?? new URL('https://portfolio.romahomestore.com'),
    locales: { es, en },
    articles: { es: list('es'), en: list('en') },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
