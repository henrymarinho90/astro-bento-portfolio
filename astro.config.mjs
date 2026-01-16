import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import Unocss from '@unocss/astro';
import svelte from '@astrojs/svelte';
import solidFs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 👇 ESTA LÍNEA ES LA LLAVE. SIN ELLA, NO HAY WEB.
  site: 'https://portfolio.romahomestore.com',

  // Adaptador Node en modo Standalone (Correcto para Coolify)
  adapter: node({
    mode: 'standalone',
  }),

  integrations: [
    Unocss({ injectReset: true }),
    svelte(),
    solidFs(),
    sitemap(),
  ],
});