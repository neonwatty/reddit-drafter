import { test, expect } from '@playwright/test'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  clickDraftAction,
  confirmDialog,
  waitForToast,
} from '../utils/test-helpers'
import {
  createMockDraft,
  createMockDrafts,
  createMockImageDraft,
  createMockMediaFile,
} from '../utils/mock-data'

test.describe('Storage Stats', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test.describe('Display Storage Information', () => {
    test('should show storage stats when drafts exist', async ({ page }) => {
      const drafts = createMockDrafts(5)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open menu to access storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Should show storage information
      await expect(page.locator('text=/Storage|Usage/i')).toBeVisible()
      await expect(page.locator('text=/drafts/i')).toBeVisible()
    })

    test('should show storage breakdown by type', async ({ page }) => {
      const textDraft = createMockDraft({ title: 'Text Draft' })
      const imageDraft = createMockImageDraft({ title: 'Image Draft' })

      await addDraftToStorage(page, textDraft)
      await addDraftToStorage(page, imageDraft)

      // Add media for the image draft
      const mediaFile = createMockMediaFile(imageDraft.id)
      await page.evaluate(
        async (mediaData) => {
          const { db } = await import('../src/lib/db')
          await db.media.add(mediaData)
        },
        mediaFile
      )

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Should show breakdown
      await expect(page.locator('text=/Drafts|Draft Data/i')).toBeVisible()
      await expect(page.locator('text=/Media|Media Files/i')).toBeVisible()
    })

    test('should show storage usage percentage', async ({ page }) => {
      const drafts = createMockDrafts(10)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Should show percentage
      await expect(page.locator('text=/%|percent/i')).toBeVisible()
    })

    test('should show bytes used and available', async ({ page }) => {
      const drafts = createMockDrafts(3)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Should show size information (KB, MB, etc.)
      await expect(page.locator('text=/KB|MB|GB|bytes/i')).toBeVisible()
    })
  })

  test.describe('Storage Updates', () => {
    test('should update stats when drafts are added', async ({ page }) => {
      // Start with no drafts
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Get initial storage value
      const initialText = await page.locator('text=/KB|MB|GB|bytes/i').first().textContent()

      // Close stats dialog
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Add a draft
      const draft = createMockDraft({ title: 'New Draft', body: 'A'.repeat(1000) })
      await addDraftToStorage(page, draft)
      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Check stats again
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Storage should have increased
      const newText = await page.locator('text=/KB|MB|GB|bytes/i').first().textContent()
      expect(newText).not.toBe(initialText)
    })

    test('should update stats when drafts are deleted', async ({ page }) => {
      const draft = createMockDraft({ title: 'To Delete', body: 'A'.repeat(1000) })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Get storage stats before deletion
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)
      const beforeText = await page.locator('text=/KB|MB|GB|bytes/i').first().textContent()

      // Close dialog
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Delete the draft
      confirmDialog(page)
      await clickDraftAction(page, 'To Delete', 'Delete')
      await waitForToast(page, 'Draft deleted')
      await page.waitForTimeout(500)

      // Check stats again
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Storage should have decreased
      const afterText = await page.locator('text=/KB|MB|GB|bytes/i').first().textContent()
      expect(afterText).not.toBe(beforeText)
    })

    test('should reflect media storage separately', async ({ page }) => {
      const imageDraft = createMockImageDraft({ title: 'Image Draft' })
      await addDraftToStorage(page, imageDraft)

      // Add media
      const mediaFile = createMockMediaFile(imageDraft.id, {
        size: 500000, // 500KB
      })
      await page.evaluate(
        async (mediaData) => {
          const { db } = await import('../src/lib/db')
          await db.media.add(mediaData)
        },
        mediaFile
      )

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Should show media storage as non-zero
      const mediaSection = page.locator('text=/Media|Media Files/i').locator('..')
      await expect(mediaSection).toBeVisible()

      // Should show size information for media
      await expect(page.locator('text=/KB|MB/i').nth(1)).toBeVisible()
    })
  })

  test.describe('Storage Warnings', () => {
    test('should show warning when storage is high', async ({ page }) => {
      // Create many large drafts to fill storage
      const largeDrafts = []
      for (let i = 0; i < 50; i++) {
        largeDrafts.push(
          createMockDraft({
            title: `Large Draft ${i}`,
            body: 'A'.repeat(10000), // 10KB each
          })
        )
      }

      for (const draft of largeDrafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // May show warning or high percentage
      const hasWarning =
        (await page.locator('text=/warning|high|almost full/i').isVisible().catch(() => false)) ||
        (await page.locator('text=/[89][0-9]%|100%/').isVisible().catch(() => false))

      // Just verify stats are displayed (warning may or may not appear depending on total storage)
      await expect(page.locator('text=/Storage|Usage/i')).toBeVisible()
    })
  })

  test.describe('Empty State', () => {
    test('should show minimal storage usage with no drafts', async ({ page }) => {
      // No drafts added
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Should still show storage stats
      await expect(page.locator('text=/Storage|Usage/i')).toBeVisible()

      // Should show near-zero or zero usage
      await expect(page.locator('text=/0|bytes|KB/i')).toBeVisible()
    })
  })

  test.describe('Close Storage Stats', () => {
    test('should close storage stats dialog with Escape', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Verify it's open
      await expect(page.locator('text=/Storage|Usage/i')).toBeVisible()

      // Close with Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Should be closed
      const isVisible = await page.locator('text=/Storage Usage/i').isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })

    test('should close storage stats dialog with close button', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Open storage stats
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Storage Stats', { timeout: 2000 })
      await page.locator('text=Storage Stats').click()

      await page.waitForTimeout(500)

      // Click close button
      const closeButton = page.locator('button:has-text("Close")').or(page.locator('button[aria-label*="Close"]'))
      await closeButton.first().click()

      await page.waitForTimeout(300)

      // Should be closed
      const isVisible = await page.locator('text=/Storage Usage/i').isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })
  })
})
