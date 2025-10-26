import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Global setup file
  globalSetup: './tests/global-setup.ts',

  // Use different reporters for CI vs local
  reporter: process.env.CI
    ? [['github'], ['html'], ['list']]
    : [['html'], ['list']],

  // Global timeout settings
  timeout: 30000, // 30 second timeout per test
  expect: {
    timeout: 5000, // 5 second timeout for expect assertions
  },

  use: {
    // Base URL for testing - using Vite preview server
    baseURL: 'http://localhost:4173',

    // Trace and screenshot settings
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Headless by default
    headless: true,

    // Action timeout
    actionTimeout: 10000, // 10 seconds for actions like click, fill, etc.
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome-specific options for extension testing
        channel: 'chrome',

        // Additional Chrome args for better CI stability
        launchOptions: {
          args: [
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-blink-features=AutomationControlled', // Hide automation flags
          ],
        },
      },
    },
  ],

  // Run build and preview server before tests
  webServer: {
    command: 'npm run preview',
    port: 4173,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
})
