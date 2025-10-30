import { Page } from '@playwright/test'
import type { RedditDraft } from '@/lib/types'
import { injectChromeMock } from './chrome-mock'

/**
 * Navigate to the popup and wait for it to be ready
 */
export async function navigateToPopup(page: Page): Promise<void> {
  // Inject chrome API mock before navigation
  await page.addInitScript(injectChromeMock)

  await page.goto('/src/popup/index.html')
  await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
  // Wait for storage to initialize
  await page.waitForTimeout(1000)
}

/**
 * Clear chrome.storage.local (run in page context)
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await chrome.storage.local.clear()
    // Also clear the mock's sessionStorage persistence
    sessionStorage.removeItem('__chrome_storage_mock__')
  })
  // Additional wait to ensure deletion is fully complete
  await page.waitForTimeout(200)
}

/**
 * Add a draft to storage programmatically using chrome.storage.local API
 */
export async function addDraftToStorage(page: Page, draft: RedditDraft): Promise<void> {
  await page.evaluate(async (draftData) => {
    // Get current drafts
    const result = await chrome.storage.local.get('drafts')
    const drafts = result.drafts || {}

    // Add new draft
    drafts[draftData.id] = draftData

    // Save back to storage
    await chrome.storage.local.set({ drafts })
  }, draft)
}

/**
 * Add media to storage programmatically using chrome.storage.local API
 */
export async function addMediaToStorage(page: Page, media: any): Promise<void> {
  await page.evaluate(async (mediaData) => {
    // Get current media
    const result = await chrome.storage.local.get('media')
    const mediaFiles = result.media || {}

    // Add new media
    mediaFiles[mediaData.id] = mediaData

    // Save back to storage
    await chrome.storage.local.set({ media: mediaFiles })
  }, media)
}

/**
 * Get all drafts from storage using chrome.storage.local API
 */
export async function getAllDraftsFromStorage(page: Page): Promise<RedditDraft[]> {
  return await page.evaluate(async () => {
    const result = await chrome.storage.local.get('drafts')
    const drafts = result.drafts || {}
    return Object.values(drafts)
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

  // Navigate up to find the Card div (which has p-4 class)
  // The structure is: Card > div.flex > div.flex-1 > div.flex > h3
  const draftCard = titleHeading.locator('xpath=ancestor::div[contains(@class, "p-4")]').first()

  // Find the dropdown menu trigger button within this card
  // It's a button with size sm (h-8 w-8 p-0) that's a sibling to the content div
  const menuButton = draftCard.locator('button').last()
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
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message: string): Promise<void> {
  await page.waitForFunction(
    (msg) => {
      const toasts = document.querySelectorAll('[data-sonner-toast]')
      return Array.from(toasts).some((toast) =>
        toast.textContent?.includes(msg)
      )
    },
    message,
    { timeout: 5000 }
  )
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
