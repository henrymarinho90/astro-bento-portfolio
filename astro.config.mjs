import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import Unocss from '@unocss/astro';
import svelte from '@astrojs/svelte';
import solidFs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 1. CAMBIO CLAVE: Quitamos "output: 'server'" para volver a modo Estático (Rápido y Estable)
  // Al no poner nada, Astro asume "static" por defecto.
  
  adapter: node({
    mode: 'standalone',
  }),

  // 2. Mantenemos intactas tus integraciones (Bento, estilos, etc.)
  integrations: [
    Unocss({
      injectReset: true,
    }),
    svelte(),
    solidFs(),
    sitemap(),
  ],
});