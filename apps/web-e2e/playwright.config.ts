import { defineConfig, devices } from '@playwright/test';

const testDatabaseUrl =
  'postgresql://meeting_room_test:meeting_room_test@127.0.0.1:5433/meeting_room_booking_test?schema=public';

export default defineConfig({
  testDir: './src',
  outputDir: '../../test-results/web-e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI']
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'api',
      command: 'npx nx serve api --configuration=development',
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3000',
        DATABASE_URL: testDatabaseUrl,
        JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-characters',
      },
    },
    {
      name: 'web',
      command:
        'npx nx serve web --configuration=development --host=127.0.0.1 --port=4200',
      url: 'http://127.0.0.1:4200',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
