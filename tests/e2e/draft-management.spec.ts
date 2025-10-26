import { test, expect } from '@playwright/test'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  getAllDraftsFromStorage,
  waitForDrafts,
  searchDrafts,
  selectFilter,
  clickDraftAction,
  switchTab,
  confirmDialog,
  cancelDialog,
  waitForToast,
} from '../utils/test-helpers'
import {
  createMockDraft,
  createMockDrafts,
  createMockLinkDraft,
  createMockPollDraft,
  createMockImageDraft,
  createMockFavoriteDraft,
  createMockDraftWithTags,
} from '../utils/mock-data'

test.describe('Draft Management', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test.describe('Display and Empty State', () => {
    test('should show empty state when no drafts exist', async ({ page }) => {
      await waitForDrafts(page, 0)
      const emptyMessage = page.locator('text=No drafts found')
      await expect(emptyMessage).toBeVisible()
    })

    test('should display drafts when they exist', async ({ page }) => {
      const drafts = createMockDrafts(3)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await waitForDrafts(page, 3)

      // Verify drafts are displayed
      for (const draft of drafts) {
        await expect(page.locator(`text=${draft.title}`)).toBeVisible()
      }
    })

    test('should show draft count in tabs', async ({ page }) => {
      const drafts = createMockDrafts(5)
      drafts[0].favorite = true
      drafts[1].favorite = true

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Check All tab count
      await expect(page.locator('text=/All.*\\(5\\)/')).toBeVisible()

      // Check Favorites tab count
      await expect(page.locator('text=/Favorites.*\\(2\\)/')).toBeVisible()
    })
  })

  test.describe('Tab Switching', () => {
    test('should switch between All and Favorites tabs', async ({ page }) => {
      const regularDraft = createMockDraft({ title: 'Regular Draft' })
      const favoriteDraft = createMockFavoriteDraft({ title: 'Favorite Draft' })

      await addDraftToStorage(page, regularDraft)
      await addDraftToStorage(page, favoriteDraft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Both should be visible in All tab
      await expect(page.locator('text=Regular Draft')).toBeVisible()
      await expect(page.locator('text=Favorite Draft')).toBeVisible()

      // Switch to Favorites tab
      await switchTab(page, 'Favorites')

      // Only favorite should be visible
      await expect(page.locator('text=Regular Draft')).not.toBeVisible()
      await expect(page.locator('text=Favorite Draft')).toBeVisible()

      // Switch back to All
      await switchTab(page, 'All')

      // Both should be visible again
      await expect(page.locator('text=Regular Draft')).toBeVisible()
      await expect(page.locator('text=Favorite Draft')).toBeVisible()
    })
  })

  test.describe('Search', () => {
    test('should filter drafts by title', async ({ page }) => {
      const drafts = [
        createMockDraft({ title: 'JavaScript Tips' }),
        createMockDraft({ title: 'Python Guide' }),
        createMockDraft({ title: 'JavaScript Best Practices' }),
      ]

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Search for "JavaScript"
      await searchDrafts(page, 'JavaScript')

      // Should show only JavaScript drafts
      await expect(page.locator('text=JavaScript Tips')).toBeVisible()
      await expect(page.locator('text=JavaScript Best Practices')).toBeVisible()
      await expect(page.locator('text=Python Guide')).not.toBeVisible()
    })

    test('should filter drafts by body content', async ({ page }) => {
      const drafts = [
        createMockDraft({ title: 'Post 1', body: 'Content about React' }),
        createMockDraft({ title: 'Post 2', body: 'Content about Vue' }),
      ]

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await searchDrafts(page, 'React')

      await expect(page.locator('text=Post 1')).toBeVisible()
      await expect(page.locator('text=Post 2')).not.toBeVisible()
    })

    test('should filter drafts by subreddit', async ({ page }) => {
      const drafts = [
        createMockDraft({ title: 'Post 1', subreddit: 'javascript' }),
        createMockDraft({ title: 'Post 2', subreddit: 'python' }),
      ]

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await searchDrafts(page, 'javascript')

      await expect(page.locator('text=Post 1')).toBeVisible()
      await expect(page.locator('text=Post 2')).not.toBeVisible()
    })

    test('should filter drafts by tags', async ({ page }) => {
      const drafts = [
        createMockDraftWithTags(['coding', 'tutorial'], { title: 'Post 1' }),
        createMockDraftWithTags(['news', 'update'], { title: 'Post 2' }),
      ]

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await searchDrafts(page, 'coding')

      await expect(page.locator('text=Post 1')).toBeVisible()
      await expect(page.locator('text=Post 2')).not.toBeVisible()
    })

    test('should show no results for non-matching search', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test Draft' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await searchDrafts(page, 'nonexistent')

      await expect(page.locator('text=No drafts found')).toBeVisible()
    })
  })

  test.describe('Filter by Post Type', () => {
    test('should filter drafts by post type', async ({ page }) => {
      const textDraft = createMockDraft({ title: 'Text Post' })
      const linkDraft = createMockLinkDraft({ title: 'Link Post' })
      const pollDraft = createMockPollDraft({ title: 'Poll Post' })

      await addDraftToStorage(page, textDraft)
      await addDraftToStorage(page, linkDraft)
      await addDraftToStorage(page, pollDraft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Filter by Link type
      await selectFilter(page, 'postType', 'Link')
      await page.waitForTimeout(500)

      await expect(page.locator('text=Link Post')).toBeVisible()
      await expect(page.locator('text=Text Post')).not.toBeVisible()
      await expect(page.locator('text=Poll Post')).not.toBeVisible()
    })
  })

  test.describe('Sort', () => {
    test('should sort by newest first (default)', async ({ page }) => {
      const drafts = createMockDrafts(3)
      // Reverse order so oldest is added first
      for (let i = drafts.length - 1; i >= 0; i--) {
        await addDraftToStorage(page, drafts[i])
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Get all draft titles in order
      const titles = await page.locator('[class*="card"] h3').allTextContents()

      // Newest should be first
      expect(titles[0]).toContain('Test Draft 1')
    })

    test('should sort by oldest first', async ({ page }) => {
      const drafts = createMockDrafts(3)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await selectFilter(page, 'sort', 'Oldest first')
      await page.waitForTimeout(500)

      const titles = await page.locator('[class*="card"] h3').allTextContents()

      // Oldest should be first
      expect(titles[0]).toContain('Test Draft 3')
    })

    test('should sort by title alphabetically', async ({ page }) => {
      const drafts = [
        createMockDraft({ title: 'Zebra' }),
        createMockDraft({ title: 'Apple' }),
        createMockDraft({ title: 'Mango' }),
      ]

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await selectFilter(page, 'sort', 'Title (A-Z)')
      await page.waitForTimeout(500)

      const titles = await page.locator('[class*="card"] h3').allTextContents()

      expect(titles[0]).toContain('Apple')
      expect(titles[1]).toContain('Mango')
      expect(titles[2]).toContain('Zebra')
    })
  })

  test.describe('Draft Actions', () => {
    test('should toggle favorite status', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test Draft' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Toggle to favorite
      await clickDraftAction(page, 'Test Draft', 'Favorite')
      await waitForToast(page, 'Added to favorites')

      // Check Favorites tab count increased
      await expect(page.locator('text=/Favorites.*\\(1\\)/')).toBeVisible()

      // Toggle back
      await clickDraftAction(page, 'Test Draft', 'Unfavorite')
      await waitForToast(page, 'Removed from favorites')

      // Check Favorites tab count decreased
      await expect(page.locator('text=/Favorites.*\\(0\\)/')).toBeVisible()
    })

    test('should delete a draft with confirmation', async ({ page }) => {
      const draft = createMockDraft({ title: 'Delete Me' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Set up dialog handler
      confirmDialog(page)

      // Delete the draft
      await clickDraftAction(page, 'Delete Me', 'Delete')
      await waitForToast(page, 'Draft deleted')

      // Should show empty state
      await expect(page.locator('text=No drafts found')).toBeVisible()
    })

    test('should cancel delete when dialog is dismissed', async ({ page }) => {
      const draft = createMockDraft({ title: 'Keep Me' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Set up dialog handler to cancel
      cancelDialog(page)

      // Try to delete
      await clickDraftAction(page, 'Keep Me', 'Delete')
      await page.waitForTimeout(500)

      // Draft should still be visible
      await expect(page.locator('text=Keep Me')).toBeVisible()
    })

    test('should duplicate a draft', async ({ page }) => {
      const draft = createMockDraft({ title: 'Original' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Original', 'Duplicate')
      await waitForToast(page, 'Draft duplicated')

      // Should see both original and copy
      await expect(page.locator('text=Original').first()).toBeVisible()
      await expect(page.locator('text=Original (Copy)')).toBeVisible()

      // Count should be 2
      await expect(page.locator('text=/All.*\\(2\\)/')).toBeVisible()
    })
  })

  test.describe('Delete All', () => {
    test('should delete all drafts with confirmation', async ({ page }) => {
      const drafts = createMockDrafts(3)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      confirmDialog(page)

      // Click menu and select Delete All
      // Use the header menu button (there should be one visible button in the header)
      await page.locator('button[aria-haspopup="menu"]').click()
      await page.waitForSelector('text=Delete All Drafts', { timeout: 2000 })
      await page.locator('text=Delete All Drafts').click()

      await waitForToast(page, 'All drafts deleted')

      // Should show empty state
      await expect(page.locator('text=No drafts found')).toBeVisible()
    })
  })
})
