import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = !!process.env.CI;
// CI builds once in its own step; set E2E_SKIP_BUILD=1 to reuse that dist/.
const skipBuild = !!process.env.E2E_SKIP_BUILD;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Phone-sized smoke run of the core flows and accessibility checks.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: ['notes.spec.ts', 'transfer.spec.ts'],
    },
  ],
  webServer: {
    command: `${skipBuild ? '' : 'npm run build && '}npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
