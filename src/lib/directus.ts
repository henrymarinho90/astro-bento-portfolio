import { createDirectus, rest } from '@directus/sdk';

// Definimos el esquema exacto de tus datos
type Schema = {
  projects: {
    id: number;
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