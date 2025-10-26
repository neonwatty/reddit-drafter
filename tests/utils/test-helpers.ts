import { Page } from '@playwright/test'
import type { RedditDraft } from '@/lib/types'

/**
 * Navigate to the popup and wait for it to be ready
 */
export async function navigateToPopup(page: Page): Promise<void> {
  await page.goto('/src/popup/index.html')
  await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
  // Wait for storage to initialize
  await page.waitForTimeout(1000)
}

/**
 * Clear IndexedDB storage (run in page context)
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const dbs = await window.indexedDB.databases()
    const deletePromises = dbs.map((db) => {
      if (db.name) {
        return new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(db.name)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
          request.onblocked = () => {
            // If blocked, resolve anyway after a timeout
            setTimeout(() => resolve(), 1000)
          }
        })
      }
      return Promise.resolve()
    })
    await Promise.all(deletePromises)
  })
  // Additional wait to ensure deletion is fully complete
  await page.waitForTimeout(200)
}

/**
 * Add a draft to storage programmatically using native IndexedDB API
 */
export async function addDraftToStorage(page: Page, draft: RedditDraft): Promise<void> {
  await page.evaluate(async (draftData) => {
    return new Promise<void>((resolve, reject) => {
      // Open without version to use existing database version
      const request = window.indexedDB.open('RedditDrafterDB')

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result

        // Check if drafts store exists, if not the database needs to be initialized
        if (!db.objectStoreNames.contains('drafts')) {
          db.close()
          reject(new Error('Database not initialized. Run clearStorage() and reload first.'))
          return
        }

        const transaction = db.transaction(['drafts'], 'readwrite')
        const store = transaction.objectStore('drafts')
        const addRequest = store.add(draftData)

        addRequest.onerror = () => reject(addRequest.error)
        addRequest.onsuccess = () => {
          db.close()
          resolve()
        }
      }
    })
  }, draft)
}

/**
 * Get all drafts from storage using native IndexedDB API
 */
export async function getAllDraftsFromStorage(page: Page): Promise<RedditDraft[]> {
  return await page.evaluate(async () => {
    return new Promise<any[]>((resolve, reject) => {
      // Open without version to use existing database version
      const request = window.indexedDB.open('RedditDrafterDB')

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        const db = request.result

        // Check if drafts store exists
        if (!db.objectStoreNames.contains('drafts')) {
          db.close()
          resolve([])
          return
        }

        const transaction = db.transaction(['drafts'], 'readonly')
        const store = transaction.objectStore('drafts')
        const getAllRequest = store.getAll()

        getAllRequest.onerror = () => reject(getAllRequest.error)
        getAllRequest.onsuccess = () => {
          db.close()
          resolve(getAllRequest.result)
        }
      }
    })
  })
}

/**
 * Wait for drafts to appear in the UI
 */
export async function waitForDrafts(page: Page, expectedCount?: number): Promise<void> {
  if (expectedCount === 0) {
    await page.waitForSelector('text=No drafts found', { timeout: 5000 })
  } else {
    // Wait for draft cards to appear
    await page.waitForSelector('[class*="card"]', { timeout: 5000 })
    if (expectedCount) {
      await page.waitForFunction(
        (count) => {
          const cards = document.querySelectorAll('[class*="card"]')
          return cards.length >= count
        },
        expectedCount,
        { timeout: 5000 }
      )
    }
  }
}

/**
 * Open the command palette
 */
export async function openCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Control+k')
  // Wait for the overlay to appear (unique element that only exists when open)
  await page.waitForSelector('.command-palette-overlay', { timeout: 2000, state: 'visible' })
}

/**
 * Close the command palette
 */
export async function closeCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  // Wait for the overlay to be removed from DOM (component returns null when closed)
  await page.waitForSelector('.command-palette-overlay', { timeout: 2000, state: 'detached' })
}

/**
 * Search in the UI
 */
export async function searchDrafts(page: Page, query: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"]')
  await searchInput.fill(query)
  // Wait for debounce/filtering
  await page.waitForTimeout(300)
}

/**
 * Select a filter option
 */
export async function selectFilter(page: Page, filterType: 'postType' | 'sort', value: string): Promise<void> {
  const selectors = page.locator('[role="combobox"]')
  const filterButton = filterType === 'postType' ? selectors.first() : selectors.last()

  await filterButton.click()
  await page.waitForSelector('[role="option"]', { timeout: 2000 })
  await page.locator(`[role="option"]:has-text("${value}")`).click()
  await page.waitForTimeout(300)
}

/**
 * Click on a draft card's menu and select an action
 */
export async function clickDraftAction(
  page: Page,
  draftTitle: string,
  action: 'Edit' | 'Favorite' | 'Unfavorite' | 'Duplicate' | 'Export' | 'Delete'
): Promise<void> {
  // Find the h3 with the exact title text
  const titleHeading = page.locator(`h3:has-text("${draftTitle}")`)
  await titleHeading.waitFor({ state: 'visible', timeout: 5000 })

  // Navigate up to find the Card div (which has the menu button)
  // The structure is: Card > div.flex > div.flex-1 > div.flex > h3
  // So we need to go up to the Card which contains both the content and the menu button
  const draftCard = titleHeading.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first()

  // Find the menu button (MoreVertical icon button) within this card
  const menuButton = draftCard.locator('button[class*="ghost"]').last()
  await menuButton.click()

  // Wait for menu to open
  await page.waitForSelector('[role="menuitem"]', { timeout: 2000 })

  // Click the action
  await page.locator(`[role="menuitem"]:has-text("${action}")`).click()

  // Wait for menu to close
  await page.waitForTimeout(300)
}

/**
 * Switch to a tab
 */
export async function switchTab(page: Page, tab: 'All' | 'Favorites'): Promise<void> {
  await page.locator(`[role="tab"]:has-text("${tab}")`).click()
  await page.waitForTimeout(300)
}

/**
 * Mock file upload
 */
export async function mockFileUpload(page: Page, fileName: string, fileType: string, content: string): Promise<void> {
  // This would be implemented with page.setInputFiles() for actual file inputs
  // For now, we'll use evaluate to mock the File API
  await page.evaluate(
    ({ name, type, data }) => {
      const file = new File([data], name, { type })
      // Store for later use in tests
      (window as any).__mockFile = file
    },
    { name: fileName, type: fileType, data: content }
  )
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message: string): Promise<void> {
  await page.waitForSelector(`text=${message}`, { timeout: 5000 })
}

/**
 * Confirm dialog
 */
export async function confirmDialog(page: Page): Promise<void> {
  page.on('dialog', async (dialog) => {
    await dialog.accept()
  })
}

/**
 * Cancel dialog
 */
export async function cancelDialog(page: Page): Promise<void> {
  page.on('dialog', async (dialog) => {
    await dialog.dismiss()
  })
}
