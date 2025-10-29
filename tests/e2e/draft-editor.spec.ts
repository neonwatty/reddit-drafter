import { test, expect } from '@playwright/test'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  getAllDraftsFromStorage,
  clickDraftAction,
  waitForToast,
} from '../utils/test-helpers'
import { createMockDraft, createMockLinkDraft, createMockPollDraft } from '../utils/mock-data'

test.describe('Draft Editor', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test.describe('Open and Close', () => {
    test('should open draft editor modal', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test Draft' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Click Edit action
      await clickDraftAction(page, 'Test Draft', 'Edit')

      // Modal should be visible
      await expect(page.locator('text=Edit Draft')).toBeVisible()
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    })

    test('should close editor with cancel button', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test Draft' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test Draft', 'Edit')
      await expect(page.locator('text=Edit Draft')).toBeVisible()

      // Click Cancel
      await page.locator('button:has-text("Cancel")').click()
      await page.waitForTimeout(300)

      // Modal should be closed
      const dialog = page.locator('[role="dialog"]')
      const isVisible = await dialog.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })
  })

  test.describe('Content Tab', () => {
    test('should edit draft title', async ({ page }) => {
      const draft = createMockDraft({ title: 'Original Title' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Original Title', 'Edit')
      await expect(page.locator('text=Edit Draft')).toBeVisible()

      // Edit title
      const titleInput = page.locator('input#title')
      await titleInput.fill('Updated Title')

      // Save
      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      // Verify in list
      await expect(page.locator('text=Updated Title')).toBeVisible()
      await expect(page.locator('text=Original Title')).not.toBeVisible()
    })

    test('should edit draft subreddit', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', subreddit: 'oldsubreddit' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Edit subreddit
      const subredditInput = page.locator('input#subreddit')
      await subredditInput.fill('newsubreddit')

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      // Verify in storage
      await page.waitForTimeout(500)
      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].subreddit).toBe('newsubreddit')
    })

    test('should edit draft body for text posts', async ({ page }) => {
      const draft = createMockDraft({
        title: 'Test',
        body: 'Original body text',
        postType: 'text',
      })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Edit body
      const bodyTextarea = page.locator('textarea#body')
      await bodyTextarea.fill('Updated body text')

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].body).toBe('Updated body text')
    })

    test('should change post type', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', postType: 'text' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Change post type to Link
      await page.locator('button[id="postType"]').click()
      await page.locator('[role="option"]:has-text("Link")').click()

      // URL field should appear
      await expect(page.locator('input#link')).toBeVisible()

      // Fill URL
      await page.locator('input#link').fill('https://example.com')

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].postType).toBe('link')
      expect(drafts[0].link).toBe('https://example.com')
    })

    test('should show link field only for link posts', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', postType: 'text' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Link field should not be visible for text posts
      const linkInput = page.locator('input#link')
      const isVisible = await linkInput.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })
  })

  test.describe('Metadata Tab', () => {
    test('should toggle NSFW flag', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', nsfw: false })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Switch to Metadata tab
      await page.locator('[role="tab"]:has-text("Metadata")').click()

      // Toggle NSFW
      await page.locator('button#nsfw').click()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].nsfw).toBe(true)
    })

    test('should toggle Spoiler flag', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', spoiler: false })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      await page.locator('[role="tab"]:has-text("Metadata")').click()
      await page.locator('button#spoiler').click()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].spoiler).toBe(true)
    })

    test('should toggle OC flag', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', oc: false })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      await page.locator('[role="tab"]:has-text("Metadata")').click()
      await page.locator('button#oc').click()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].oc).toBe(true)
    })

    test('should toggle send replies flag', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', sendReplies: true })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      await page.locator('[role="tab"]:has-text("Metadata")').click()
      await page.locator('button#sendReplies').click()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].sendReplies).toBe(false)
    })
  })

  test.describe('Organization Tab', () => {
    test('should add tags', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', tags: [] })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Switch to Organization tab
      await page.locator('[role="tab"]:has-text("Organization")').click()

      // Add a tag
      const tagInput = page.locator('input#tags')
      await tagInput.fill('newtag')
      await page.locator('button:has-text("Add")').click()

      // Tag should appear
      await expect(page.locator('text=newtag')).toBeVisible()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].tags).toContain('newtag')
    })

    test('should add tag with Enter key', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', tags: [] })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Organization")').click()

      const tagInput = page.locator('input#tags')
      await tagInput.fill('entertag')
      await page.keyboard.press('Enter')

      await expect(page.locator('text=entertag')).toBeVisible()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].tags).toContain('entertag')
    })

    test('should remove tags', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', tags: ['tag1', 'tag2'] })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')
      const dialog = page.locator('[role="dialog"]')
      await dialog.locator('[role="tab"]:has-text("Organization")').click()

      // Click X on tag1 (use first() to avoid strict mode violation if text appears multiple times)
      await dialog.locator('button[aria-label="Remove tag tag1"]').click()

      // tag1 should be removed
      await expect(dialog.locator('text=tag1')).not.toBeVisible()
      await expect(dialog.locator('text=tag2')).toBeVisible()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].tags).not.toContain('tag1')
      expect(drafts[0].tags).toContain('tag2')
    })

    test('should edit notes', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', notes: 'Original notes' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Organization")').click()

      const notesTextarea = page.locator('textarea#notes')
      await notesTextarea.fill('Updated notes')

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].notes).toBe('Updated notes')
    })

    test('should toggle favorite in editor', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', favorite: false })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Organization")').click()

      await page.locator('button#favorite').click()

      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].favorite).toBe(true)

      // Should appear in Favorites tab
      await expect(page.locator('text=/Favorites.*\\(1\\)/')).toBeVisible()
    })
  })

  test.describe('Media Tab', () => {
    test('should show media tab for image posts', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', postType: 'image' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Media tab should be visible
      await expect(page.locator('[role="tab"]:has-text("Media")')).toBeVisible()
    })

    test('should show media tab for video posts', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', postType: 'video' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      await expect(page.locator('[role="tab"]:has-text("Media")')).toBeVisible()
    })

    test('should hide media tab for non-media post types', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', postType: 'text' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Media tab should not be visible
      const mediaTab = page.locator('[role="tab"]:has-text("Media")')
      await expect(mediaTab).toHaveCount(0)
    })
  })

  test.describe('Tab Navigation', () => {
    test('should navigate between tabs', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test', postType: 'image' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Start on Content tab
      const contentTab = page.locator('[role="tab"]:has-text("Content")')
      await expect(contentTab).toHaveAttribute('aria-selected', 'true')

      // Navigate to Metadata
      await page.locator('[role="tab"]:has-text("Metadata")').click()
      const metadataTab = page.locator('[role="tab"]:has-text("Metadata")')
      await expect(metadataTab).toHaveAttribute('aria-selected', 'true')

      // Navigate to Media
      await page.locator('[role="tab"]:has-text("Media")').click()
      const mediaTab = page.locator('[role="tab"]:has-text("Media")')
      await expect(mediaTab).toHaveAttribute('aria-selected', 'true')

      // Navigate to Organization
      await page.locator('[role="tab"]:has-text("Organization")').click()
      const orgTab = page.locator('[role="tab"]:has-text("Organization")')
      await expect(orgTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  test.describe('Validation', () => {
    test('should validate title is required', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Clear title
      const titleInput = page.locator('input#title')
      await titleInput.fill('')

      await page.locator('button:has-text("Save Changes")').click()

      // Should show validation error
      await waitForToast(page, 'Validation failed')
    })

    test('should validate subreddit is required', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test', 'Edit')

      // Clear subreddit
      const subredditInput = page.locator('input#subreddit')
      await subredditInput.fill('')

      await page.locator('button:has-text("Save Changes")').click()

      await waitForToast(page, 'Validation failed')
    })
  })

  test.describe('Cancel Without Saving', () => {
    test('should not save changes when cancelled', async ({ page }) => {
      const draft = createMockDraft({ title: 'Original Title' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Original Title', 'Edit')

      // Make changes
      const titleInput = page.locator('input#title')
      await titleInput.fill('Changed Title')

      // Cancel
      await page.locator('button:has-text("Cancel")').click()
      await page.waitForTimeout(300)

      // Title should still be original
      await expect(page.locator('text=Original Title')).toBeVisible()
      await expect(page.locator('text=Changed Title')).not.toBeVisible()

      // Verify in storage
      const drafts = await getAllDraftsFromStorage(page)
      expect(drafts[0].title).toBe('Original Title')
    })
  })
})
