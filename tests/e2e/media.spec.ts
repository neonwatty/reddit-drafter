import { test, expect } from '@playwright/test'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  addMediaToStorage,
  clickDraftAction,
  waitForToast,
} from '../utils/test-helpers'
import {
  createMockDraft,
  createMockImageDraft,
  createMockMediaFile,
  createMockVideoFile,
} from '../utils/mock-data'

test.describe('Media Management', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test.describe('Media Tab Visibility', () => {
    test('should show Media tab for Image post type', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Image Post' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Image Post', 'Edit')
      await expect(page.locator('text=Edit Draft')).toBeVisible()

      // Media tab should be visible
      await expect(page.locator('[role="tab"]:has-text("Media")')).toBeVisible()
    })

    test('should hide Media tab for Text post type', async ({ page }) => {
      const draft = createMockDraft({ title: 'Text Post', postType: 'text' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Text Post', 'Edit')
      await expect(page.locator('text=Edit Draft')).toBeVisible()

      // Media tab should not be visible
      const mediaTab = page.locator('[role="tab"]:has-text("Media")')
      const isVisible = await mediaTab.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })

    test('should hide Media tab for Link post type', async ({ page }) => {
      const draft = createMockDraft({ title: 'Link Post', postType: 'link', url: 'https://example.com' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Link Post', 'Edit')

      // Media tab should not be visible
      const mediaTab = page.locator('[role="tab"]:has-text("Media")')
      const isVisible = await mediaTab.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })

    test('should hide Media tab for Poll post type', async ({ page }) => {
      const draft = createMockDraft({
        title: 'Poll Post',
        postType: 'poll',
        pollOptions: ['Option 1', 'Option 2'],
      })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Poll Post', 'Edit')

      // Media tab should not be visible
      const mediaTab = page.locator('[role="tab"]:has-text("Media")')
      const isVisible = await mediaTab.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })

    test('should show Media tab when changing post type to Image', async ({ page }) => {
      const draft = createMockDraft({ title: 'Test Post', postType: 'text' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Test Post', 'Edit')

      // Media tab should not be visible initially
      let mediaTab = page.locator('[role="tab"]:has-text("Media")')
      let isVisible = await mediaTab.isVisible().catch(() => false)
      expect(isVisible).toBe(false)

      // Change post type to Image
      const postTypeSelect = page.locator('button#postType')
      await postTypeSelect.click()
      await page.locator('[role="option"]:has-text("Image")').click()
      await page.waitForTimeout(300)

      // Media tab should now be visible
      await expect(mediaTab).toBeVisible()
    })
  })

  test.describe('Upload Media', () => {
    test('should upload a single image', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Upload Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Upload Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      // Set up file chooser
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      const fileChooser = await fileChooserPromise

      // Create a fake image file
      const buffer = Buffer.from('fake-image-data')
      await fileChooser.setFiles({
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: buffer,
      })

      // Wait for upload to process
      await page.waitForTimeout(1000)

      // Should show success message or preview
      await expect(
        page.locator('text=/uploaded|test-image.jpg/i').first()
      ).toBeVisible({ timeout: 5000 })
    })

    test('should upload multiple images', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Multi Upload' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Multi Upload', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      // Upload first image
      let fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      let fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'image1.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-1'),
      })

      await page.waitForTimeout(1000)

      // Upload second image
      fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'image2.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-2'),
      })

      await page.waitForTimeout(1000)

      // Should show both images by their filenames
      await expect(page.locator('text=image1.jpg')).toBeVisible()
      await expect(page.locator('text=image2.jpg')).toBeVisible()
    })

    test('should upload a video', async ({ page }) => {
      const draft = createMockDraft({ title: 'Video Upload', postType: 'video' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Video Upload', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake-video-data'),
      })

      await page.waitForTimeout(1000)

      // Should show video filename
      await expect(page.locator('text=test-video.mp4')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Remove Media', () => {
    test('should remove uploaded media', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Remove Test' })
      const mediaFile = createMockMediaFile(draft.id)

      // Add draft and media file to IndexedDB
      await addDraftToStorage(page, draft)
      await addMediaToStorage(page, mediaFile)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Remove Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      // Should see the media file
      await expect(page.locator(`text=${mediaFile.name}`)).toBeVisible()

      // Handle confirmation dialog
      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Click remove button
      const removeButton = page.locator('button[aria-label*="Remove"]').first()
      await removeButton.click()

      await page.waitForTimeout(500)

      // Media should be removed
      const isVisible = await page.locator(`text=${mediaFile.name}`).isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })
  })

  test.describe('Media Validation', () => {
    test('should show error for invalid file type', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Invalid Type Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Invalid Type Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      const fileChooser = await fileChooserPromise

      // Try to upload a text file instead of an image
      await fileChooser.setFiles({
        name: 'document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not an image'),
      })

      await page.waitForTimeout(1000)

      // Should show error message
      await expect(
        page.locator('text=/invalid|unsupported|file type/i').first()
      ).toBeVisible({ timeout: 5000 })
    })

    test('should show error for oversized file', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Size Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Size Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      const fileChooser = await fileChooserPromise

      // Create a large buffer (21MB - exceeds typical 20MB limit)
      const largeBuffer = Buffer.alloc(21 * 1024 * 1024)
      await fileChooser.setFiles({
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer,
      })

      await page.waitForTimeout(1000)

      // Should show size error (actual message: "Image must be under 20MB")
      await expect(
        page.locator('text=/under 20MB|20MB/i').first()
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Media Display', () => {
    test('should display image preview', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Preview Test' })
      const mediaFile = createMockMediaFile(draft.id)

      await addDraftToStorage(page, draft)
      await addMediaToStorage(page, mediaFile)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Preview Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      // Should show image preview or filename
      await expect(page.locator(`text=${mediaFile.name}`)).toBeVisible()

      // Check for image element with data URL (not blob URL)
      const images = page.locator('img[src^="data:image"]')
      const imageCount = await images.count()
      expect(imageCount).toBeGreaterThanOrEqual(1)
    })

    test.skip('should show media count indicator', async ({ page }) => {
      // TODO: DraftCard component doesn't display media count yet - feature needs to be implemented
      const draft = createMockImageDraft({ title: 'Count Test' })
      const media1 = createMockMediaFile(draft.id)
      const media2 = createMockMediaFile(draft.id, { name: 'image2.jpg' })

      await addDraftToStorage(page, draft)
      await addMediaToStorage(page, media1)
      await addMediaToStorage(page, media2)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Should show media count on the draft card
      const draftCard = page.locator(`text=Count Test`).locator('..')
      await expect(draftCard.locator('text=/2.*files?|2.*images?/i')).toBeVisible()
    })
  })

  test.describe('Media Persistence', () => {
    test('should save media when saving draft', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Save Test' })
      await addDraftToStorage(page, draft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await clickDraftAction(page, 'Save Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      // Upload an image
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.locator('button', { hasText: /Upload/i }).click()

      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles({
        name: 'persistent-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('test-data'),
      })

      await page.waitForTimeout(1000)

      // Save the draft
      await page.locator('button:has-text("Save Changes")').click()
      await waitForToast(page, 'Draft updated successfully')

      // Reopen the draft
      await page.waitForTimeout(500)
      await clickDraftAction(page, 'Save Test', 'Edit')
      await page.locator('[role="tab"]:has-text("Media")').click()

      // Media should still be there
      await expect(page.locator('text=persistent-image.jpg')).toBeVisible()
    })

    test('should delete media when deleting draft', async ({ page }) => {
      const draft = createMockImageDraft({ title: 'Delete Test' })
      const mediaFile = createMockMediaFile(draft.id)

      await addDraftToStorage(page, draft)
      await addMediaToStorage(page, mediaFile)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Confirm deletion
      page.on('dialog', (dialog) => dialog.accept())

      // Delete the draft
      await clickDraftAction(page, 'Delete Test', 'Delete')
      await waitForToast(page, 'Draft deleted')

      // Verify media is also deleted from storage
      const mediaCount = await page.evaluate(async () => {
        return new Promise<number>((resolve, reject) => {
          const request = window.indexedDB.open('RedditDrafterDB')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const db = request.result
            if (!db.objectStoreNames.contains('media')) {
              db.close()
              resolve(0)
              return
            }
            const transaction = db.transaction(['media'], 'readonly')
            const store = transaction.objectStore('media')
            const countRequest = store.count()
            countRequest.onerror = () => reject(countRequest.error)
            countRequest.onsuccess = () => {
              db.close()
              resolve(countRequest.result)
            }
          }
        })
      })

      expect(mediaCount).toBe(0)
    })
  })
})
