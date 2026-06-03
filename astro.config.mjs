import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// If you deploy to a PROJECT page (e.g. username.github.io/portfolio),
// uncomment `base` and set it to '/your-repo-name'. For a custom domain
// (dustinsavery.com) or a user repo (username.github.io), leave base off.
export default defineConfig({
  site: 'https://dustinsavery.com',
  // base: '/savery-portfolio',
  integrations: [react()],
});
