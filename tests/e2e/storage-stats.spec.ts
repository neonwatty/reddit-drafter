import { test, expect, Page } from '@playwright/test'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  addMediaToStorage,
} from '../utils/test-helpers'
import {
  createMockDraft,
  createMockDrafts,
  createMockImageDraft,
  createMockMediaFile,
} from '../utils/mock-data'

const STORAGE_HEADER = 'text=Storage Usage'
const STORAGE_CARD = `${STORAGE_HEADER} >> xpath=ancestor::div[contains(@class,"card") or contains(@class,"p-")]`

async function waitForStorageCard(page: Page) {
  await page.waitForSelector(STORAGE_HEADER, { timeout: 5000 })
}

test.describe('Storage Stats', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test('should render storage usage summary', async ({ page }) => {
    const drafts = createMockDrafts(3)
    for (const draft of drafts) {
      await addDraftToStorage(page, draft)
    }

    await page.reload()
    await waitForStorageCard(page)

    const usageCard = page.locator(STORAGE_CARD)
    await expect(usageCard.locator('text=/[0-9]+\\.[0-9]{2} [KMG]?B/i').first()).toBeVisible()
  })

  test('should hide media stats when no media files exist', async ({ page }) => {
    await page.reload()
    await waitForStorageCard(page)

    await expect(page.locator('text=/Media:\\s+\\d+ files?/i')).toHaveCount(0)
  })

  test('should show media stats when media files exist', async ({ page }) => {
    const imageDraft = createMockImageDraft({ title: 'Image Draft' })
    await addDraftToStorage(page, imageDraft)

    const mediaFile = createMockMediaFile(imageDraft.id, { size: 250000 })
    await addMediaToStorage(page, mediaFile)

    await page.reload()
    await waitForStorageCard(page)

    await expect(page.locator('text=/Media:\\s+1 file/i')).toBeVisible()
  })

  test('should refresh media stats after clearing storage', async ({ page }) => {
    const imageDraft = createMockImageDraft({ title: 'Image Draft' })
    await addDraftToStorage(page, imageDraft)
    await addMediaToStorage(page, createMockMediaFile(imageDraft.id))

    await page.reload()
    await waitForStorageCard(page)
    await expect(page.locator('text=/Media:\\s+1 file/i')).toBeVisible()

    await clearStorage(page)
    await page.reload()
    await waitForStorageCard(page)
    await expect(page.locator('text=/Media:/i')).toHaveCount(0)
  })

  // FIXME: StorageStats component uses navigator.storage.estimate() which doesn't track chrome.storage.local
  // The component needs to be updated to use chrome.storage.local.getBytesInUse() and listen for storage changes
  // See: src/popup/components/StorageStats.tsx
  test.skip('should update usage after adding a large draft', async ({ page }) => {
    await page.reload()
    await waitForStorageCard(page)
    const initialUsage = await page
      .locator(STORAGE_CARD)
      .locator('text=/[0-9]+\\.[0-9]{2} [KMG]?B/i')
      .first()
      .textContent()

    const draft = createMockDraft({ title: 'Large Draft', body: 'X'.repeat(5000) })
    await addDraftToStorage(page, draft)

    await page.reload()
    await waitForStorageCard(page)

    // Wait for storage stats to update with new value
    await page.waitForFunction(
      (initial) => {
        const usageElements = document.querySelectorAll('[class*="card"]')
        for (const card of usageElements) {
          if (card.textContent?.includes('Storage Usage')) {
            const match = card.textContent.match(/([0-9]+\.[0-9]{2} [KMG]?B)/i)
            if (match && match[0] !== initial) {
              return true
            }
          }
        }
        return false
      },
      initialUsage,
      { timeout: 5000 }
    )

    const updatedUsage = await page
      .locator(STORAGE_CARD)
      .locator('text=/[0-9]+\\.[0-9]{2} [KMG]?B/i')
      .first()
      .textContent()

    expect(updatedUsage).not.toBe(initialUsage)
  })
})
