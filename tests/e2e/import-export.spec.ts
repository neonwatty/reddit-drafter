import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  getAllDraftsFromStorage,
  waitForToast,
  clickDraftAction,
} from '../utils/test-helpers'
import { createMockDraft, createMockDrafts } from '../utils/mock-data'

test.describe('Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test.describe('Export Single Draft', () => {
    test('should export a single draft to JSON', async ({ page }) => {
      const draft = createMockDraft({ title: 'Export Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download')

      // Click menu on draft and export using helper
      await clickDraftAction(page, 'Export Test', 'Export')

      // Wait for download
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/reddit-draft.*\.json$/)

      // Verify toast
      await waitForToast(page, 'Draft exported successfully')
    })
  })

  test.describe('Export All Drafts', () => {
    test('should export all drafts to JSON', async ({ page }) => {
      const drafts = createMockDrafts(3)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      const downloadPromise = page.waitForEvent('download')

      // Click header menu and export all
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Export All (JSON)', { timeout: 2000 })
      await page.locator('text=Export All (JSON)').click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/reddit-drafts.*\.json$/)

      await waitForToast(page, 'Exported 3 drafts')
    })

    test('should export all drafts to CSV', async ({ page }) => {
      const drafts = createMockDrafts(2)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      const downloadPromise = page.waitForEvent('download')

      // Click header menu and export CSV
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Export All (CSV)', { timeout: 2000 })
      await page.locator('text=Export All (CSV)').click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/reddit-drafts.*\.csv$/)

      await waitForToast(page, 'Exported 2 drafts to CSV')
    })
  })

  test.describe('Import Drafts', () => {
    test('should import a single draft from JSON', async ({ page }) => {
      // Read the fixture file
      const fixturePath = join(process.cwd(), 'tests/fixtures/sample-draft.json')
      const fixtureContent = readFileSync(fixturePath, 'utf-8')
      const fixture = JSON.parse(fixtureContent)

      // Click header menu and import
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Import JSON', { timeout: 2000 })

      // Set up file chooser before clicking
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('text=Import JSON').click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'sample-draft.json',
        mimeType: 'application/json',
        buffer: Buffer.from(fixtureContent),
      })

      await waitForToast(page, 'Imported 1 drafts')

      // Verify draft is in storage
      await page.waitForTimeout(1000)
      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts.length).toBe(1)
      expect(drafts[0].title).toBe(fixture.title)
      expect(drafts[0].subreddit).toBe(fixture.subreddit)

      // Verify draft is visible in UI
      await expect(page.locator(`text=${fixture.title}`)).toBeVisible()
    })

    test('should import multiple drafts from JSON', async ({ page }) => {
      const fixturePath = join(process.cwd(), 'tests/fixtures/multiple-drafts.json')
      const fixtureContent = readFileSync(fixturePath, 'utf-8')

      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Import JSON', { timeout: 2000 })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('text=Import JSON').click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'multiple-drafts.json',
        mimeType: 'application/json',
        buffer: Buffer.from(fixtureContent),
      })

      await waitForToast(page, 'Imported 3 drafts')

      // Verify count
      await page.waitForTimeout(1000)
      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts.length).toBe(3)

      // Verify tab shows correct count
      await expect(page.locator('text=/All.*\\(3\\)/')).toBeVisible()
    })

    test('should handle invalid JSON gracefully', async ({ page }) => {
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Import JSON', { timeout: 2000 })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('text=Import JSON').click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('not valid json'),
      })

      // Should show error toast
      // Should show error toast (friendly message or parse error)
      await page.waitForSelector('text=/Failed to import drafts|Invalid JSON|Unexpected token/i', {
        timeout: 5000,
      })
    })

    test('should validate required fields on import', async ({ page }) => {
      const fixturePath = join(process.cwd(), 'tests/fixtures/invalid-draft.json')
      const fixtureContent = readFileSync(fixturePath, 'utf-8')

      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Import JSON', { timeout: 2000 })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('text=Import JSON').click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'invalid-draft.json',
        mimeType: 'application/json',
        buffer: Buffer.from(fixtureContent),
      })

      // Should show validation error
      await waitForToast(page, 'Invalid draft format')
    })

    test('should handle empty file', async ({ page }) => {
      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Import JSON', { timeout: 2000 })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('text=Import JSON').click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'empty.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{}'),
      })

      await waitForToast(page, 'Invalid draft format')
    })

    test('should import drafts alongside existing drafts', async ({ page }) => {
      // Add existing draft
      const existingDraft = createMockDraft({ title: 'Existing Draft' })
      await addDraftToStorage(page, existingDraft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Import another draft
      const fixturePath = join(process.cwd(), 'tests/fixtures/sample-draft.json')
      const fixtureContent = readFileSync(fixturePath, 'utf-8')

      await page.locator('button[aria-haspopup="menu"]').first().click()
      await page.waitForSelector('text=Import JSON', { timeout: 2000 })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('text=Import JSON').click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'sample-draft.json',
        mimeType: 'application/json',
        buffer: Buffer.from(fixtureContent),
      })

      await waitForToast(page, 'Imported 1 drafts')

      // Should have both drafts
      await page.waitForTimeout(1000)
      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts.length).toBe(2)

      await expect(page.locator('text=/All.*\\(2\\)/')).toBeVisible()
    })
  })
})
