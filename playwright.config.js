import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,                 // the globe page is heavy; more parallel browsers make timing-based checks flaky
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1440, height: 900 },
    },
  }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
