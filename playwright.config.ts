import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Base URL for testing the extension popup
    baseURL: 'chrome-extension://test',
    trace: 'on-first-retry',
    // Headless by default
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome-specific options for extension testing
        channel: 'chrome',
      },
    },
  ],

  // Run build before tests
  webServer: {
    command: 'npm run build',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
})
