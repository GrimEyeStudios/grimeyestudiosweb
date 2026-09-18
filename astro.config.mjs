// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://grimeyestudios.com',
  // GitHub Pages serves the site from the domain root once the custom domain is set.
  base: '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    // /games/ -> /games/index.html so GitHub Pages resolves clean URLs.
    format: 'directory',
  },
  image: {
    // Art is resized/re-encoded (webp) at build time by sharp.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
