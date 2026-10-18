import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['convex/**/*.test.js', 'tests/unit/**/*.test.js'],
    server: { deps: { inline: ['convex-test'] } },
  },
});
