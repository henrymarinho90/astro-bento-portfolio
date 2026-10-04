import { createDirectus, readItems, rest } from '@directus/sdk';

// Definimos el esquema exacto de tus datos
type Schema = {
  projects: {
    id: number;
    slug: string;
    content: string | null;
    repo_link: string | null;
    title: string;
    description: string;
    image: string | null; // Puede ser null si no hay imagen
    url: string | null;   // AÑADIDO: Para que no te de error project.url
    status: string;
    date_created: string;
  }[];
  experience: {
    id: number;
    company: string;
    role: string;
    description: string;
    start_date: string;
    end_date: string | null;
    status: string;
  }[];
};

// Asegúrate que esta URL sea la correcta (la de tu .env o la pública)
export const directus = createDirectus<Schema>('https://cms.romahomestore.com').with(rest());

// -1 evita el límite predeterminado de Directus al generar rutas, índice y RSS.
// No ocultar errores: un build incompleto no debe reemplazar el sitio publicado.
export async function getPublishedProjects(limit = -1, client = directus) {
  const projects = await client.request(readItems('projects', {
    fields: ['slug', 'title', 'image', 'content', 'repo_link', 'url', 'description', 'date_created'],
    filter: { status: { _eq: 'published' } },
    sort: ['-date_created', '-id'],
    limit,
  }));
  if (!Array.isArray(projects)) throw new Error('Invalid projects response from Directus');
  return projects;
}