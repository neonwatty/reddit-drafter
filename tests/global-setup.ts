/**
 * Global setup for Playwright tests
 * This file runs once before all tests
 */

export default async function globalSetup() {
  // Playwright automatically provides chrome.storage.local mocking for extension tests
  console.log('✓ Global setup complete')
}
