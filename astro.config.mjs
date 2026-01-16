import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import Unocss from '@unocss/astro';
import svelte from '@astrojs/svelte';
import solidFs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 👇 ESTA ES LA LÍNEA QUE FALTABA Y CAUSABA EL ERROR
  site: 'https://portfolio.romahomestore.com',

  // Volvemos a modo Standalone (correcto para Coolify + Node)
  adapter: node({
    mode: 'standalone',
  }),

  integrations: [
    Unocss({
      injectReset: true,
    }),
    svelte(),
    solidFs(),
    sitemap(),
  ],
});