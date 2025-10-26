/**
 * Global setup for Playwright tests
 * This file runs once before all tests
 */

export default async function globalSetup() {
  // Setup fake-indexeddb for CI environments
  if (process.env.CI) {
    // Import fake-indexeddb
    const fakeIndexedDB = await import('fake-indexeddb')
    const FDBFactory = (await import('fake-indexeddb/lib/FDBFactory')).default

    // Set up global IndexedDB mocks
    // @ts-ignore - Setting global for testing
    global.indexedDB = new FDBFactory()
    // @ts-ignore
    global.IDBKeyRange = fakeIndexedDB.IDBKeyRange

    console.log('✓ fake-indexeddb initialized for CI environment')
  }
}
