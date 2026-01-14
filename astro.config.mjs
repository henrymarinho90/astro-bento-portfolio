import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import Unocss from '@unocss/astro';
import svelte from '@astrojs/svelte';
import solidFs from '@astrojs/solid-js';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 1. Configuramos SSR para Coolify
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

  // 2. Restauramos tus integraciones originales (Bento Stack)
  integrations: [
    Unocss({
      injectReset: true,
    }),
    svelte(),
    solidFs(),
    sitemap(),
  ],
});