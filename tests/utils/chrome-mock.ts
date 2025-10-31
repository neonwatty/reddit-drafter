/**
 * Chrome API mock for testing
 * This provides a minimal chrome.storage.local implementation for use in tests
 */

export function injectChromeMock() {
  // Use sessionStorage to persist mock data across page reloads
  const STORAGE_KEY = '__chrome_storage_mock__'

  // Load existing data from sessionStorage
  let mockStorage: Record<string, any> = {}
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      mockStorage = JSON.parse(stored)
    }
  } catch (e) {
    // Ignore errors
  }

  // Helper to persist storage
  function persistStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mockStorage))
    } catch (e) {
      // Ignore errors
    }
  }

  // Create chrome.storage.local mock
  const chromeStorageLocal = {
    async get(keys?: string | string[] | null): Promise<Record<string, any>> {
      if (keys === null || keys === undefined) {
        return { ...mockStorage }
      }
      if (typeof keys === 'string') {
        return mockStorage[keys] ? { [keys]: mockStorage[keys] } : {}
      }
      if (Array.isArray(keys)) {
        const result: Record<string, any> = {}
        keys.forEach(key => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key]
          }
        })
        return result
      }
      return {}
    },

    async set(items: Record<string, any>): Promise<void> {
      Object.assign(mockStorage, items)
      persistStorage()
    },

    async remove(keys: string | string[]): Promise<void> {
      const keysArray = typeof keys === 'string' ? [keys] : keys
      keysArray.forEach(key => {
        delete mockStorage[key]
      })
      persistStorage()
    },

    async clear(): Promise<void> {
      Object.keys(mockStorage).forEach(key => {
        delete mockStorage[key]
      })
      persistStorage()
    },

    getBytesInUse(keys: string | string[] | null, callback: (bytes: number) => void): void {
      // Calculate size based on keys parameter
      let dataToMeasure: Record<string, any> = {}

      if (keys === null || keys === undefined) {
        // Measure all storage
        dataToMeasure = mockStorage
      } else if (typeof keys === 'string') {
        if (mockStorage[keys] !== undefined) {
          dataToMeasure = { [keys]: mockStorage[keys] }
        }
      } else if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (mockStorage[key] !== undefined) {
            dataToMeasure[key] = mockStorage[key]
          }
        })
      }

      // Calculate size by converting to JSON and measuring bytes
      const jsonString = JSON.stringify(dataToMeasure)
      const bytes = new TextEncoder().encode(jsonString).length
      callback(bytes)
    },

    // Mock quota (10MB like chrome.storage.local)
    QUOTA_BYTES: 10485760
  }

  // Inject into global scope
  // @ts-ignore
  window.chrome = {
    storage: {
      local: chromeStorageLocal,
      onChanged: {
        addListener: () => {},
        removeListener: () => {}
      }
    },
    runtime: {
      sendMessage: () => Promise.resolve(),
      onMessage: {
        addListener: () => {},
        removeListener: () => {}
      }
    },
    tabs: {
      // Mock query - returns empty tab for popup testing
      query: async () => {
        return [{
          id: 1,
          url: 'about:blank',
          active: true,
          windowId: 1,
          index: 0,
          highlighted: false,
          incognito: false,
          pinned: false,
          selected: false
        }]
      },
      // Mock sendMessage - returns empty response
      sendMessage: async () => {
        return { success: false, error: 'Not on Reddit submit page' }
      },
      // Mock tab update listener
      onUpdated: {
        addListener: () => {},
        removeListener: () => {}
      },
      // Mock tab activated listener
      onActivated: {
        addListener: () => {},
        removeListener: () => {}
      }
    }
  }
}
