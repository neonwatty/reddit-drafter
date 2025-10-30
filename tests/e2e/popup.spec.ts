import { test, expect } from '@playwright/test'
import { navigateToPopup } from '../utils/test-helpers'

test.describe('Popup UI', () => {
  test('should display the popup with correct title', async ({ page }) => {
    // Navigate to the popup with proper setup
    await navigateToPopup(page)

    // Check title is present
    const title = await page.locator('h1:has-text("Reddit Drafter")')
    await expect(title).toBeVisible()
  })

  test('should show tabs for All and Favorites', async ({ page }) => {
    await navigateToPopup(page)

    // Check tabs are present - use role="tab" to avoid matching filter dropdown
    await expect(page.locator('[role="tab"]').filter({ hasText: 'All' })).toBeVisible()
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Favorites' })).toBeVisible()
  })

  test('should display empty state when no drafts exist', async ({ page }) => {
    await navigateToPopup(page)

    // Should show empty state
    const emptyMessage = page.locator('text=No drafts found')
    await expect(emptyMessage).toBeVisible({ timeout: 10000 })
  })

  test('should have working search bar', async ({ page }) => {
    await navigateToPopup(page)

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    // Should be able to type
    await searchInput.fill('test search')
    await expect(searchInput).toHaveValue('test search')
  })

  test('should have filter dropdowns', async ({ page }) => {
    await navigateToPopup(page)

    // Check for filter controls - use more specific selectors
    const filterButton = page.locator('[role="combobox"]').first()
    await expect(filterButton).toBeVisible()
  })

  test('should display storage stats', async ({ page }) => {
    await navigateToPopup(page)

    // Wait for storage stats to load
    await page.waitForTimeout(500)

    // Check for storage usage component
    const storageHeading = page.locator('text=Storage Usage')
    await expect(storageHeading).toBeVisible({ timeout: 5000 })
  })

  test('should have actions menu button', async ({ page }) => {
    await navigateToPopup(page)

    // Find the header actions menu button
    const menuButton = page.locator('button').filter({ hasText: '' }).first()
    await expect(menuButton).toBeVisible()
  })
})
