import { defineConfig } from 'astro/config';
import node from '@astrojs/node'; // <--- USAMOS NODE
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone', // <--- MODO STANDALONE
  }),
  integrations: [tailwind()],
});