import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Custom domain (dustinsavery.com) → keep public/CNAME, base off.
// Project repo (user.github.io/repo) → set base: '/repo' and delete CNAME.
export default defineConfig({
  site: 'https://dustinsavery.com',
  integrations: [react()],
});
