import { getViteConfig } from 'astro/config';

// Astro's own Vite setup, so unit tests can render .astro components with the container API
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
});
