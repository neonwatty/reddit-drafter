import { test, expect } from '@playwright/test'
import {
  navigateToPopup,
  clearStorage,
  addDraftToStorage,
  openCommandPalette,
  closeCommandPalette,
  confirmDialog,
} from '../utils/test-helpers'
import { createMockDrafts, createMockFavoriteDraft } from '../utils/mock-data'

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPopup(page)
    await clearStorage(page)
    await page.reload()
    await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
    await page.waitForTimeout(1000)
  })

  test.describe('Open and Close', () => {
    test('should open command palette with Ctrl+K', async ({ page }) => {
      await openCommandPalette(page)

      // Palette overlay should be visible
      const overlay = page.locator('.command-palette-overlay')
      await expect(overlay).toBeVisible()

      // Search input should be focused
      const input = page.locator('.command-palette-input')
      await expect(input).toBeFocused()
    })

    test('should close command palette with Escape', async ({ page }) => {
      await openCommandPalette(page)

      // Verify it's open
      await expect(page.locator('.command-palette-overlay')).toBeVisible()

      // Close it
      await closeCommandPalette(page)

      // Should not exist in DOM (component returns null when closed)
      await expect(page.locator('.command-palette-overlay')).not.toBeVisible()
    })

    test('should toggle command palette with repeated Ctrl+K', async ({ page }) => {
      // Open
      await page.keyboard.press('Control+k')
      await page.waitForSelector('.command-palette-overlay', { timeout: 2000, state: 'visible' })
      await expect(page.locator('.command-palette-overlay')).toBeVisible()

      // Close with same shortcut
      await page.keyboard.press('Control+k')
      await page.waitForSelector('.command-palette-overlay', { timeout: 2000, state: 'detached' })

      await expect(page.locator('.command-palette-overlay')).not.toBeVisible()
    })
  })

  test.describe('Search and Filter', () => {
    test('should search for commands', async ({ page }) => {
      await openCommandPalette(page)

      const input = page.locator('[class*="command-palette-input"]')
      await input.fill('export')

      // Should show export-related commands
      await expect(page.locator('text=Export All Drafts (JSON)')).toBeVisible()
      await expect(page.locator('text=Export All Drafts (CSV)')).toBeVisible()

      // Should not show unrelated commands
      const viewAll = page.locator('text=View All Drafts')
      const isVisible = await viewAll.isVisible().catch(() => false)
      expect(isVisible).toBe(false)
    })

    test('should show "No results found" for non-matching search', async ({ page }) => {
      await openCommandPalette(page)

      const input = page.locator('[class*="command-palette-input"]')
      await input.fill('nonexistentcommand')

      await expect(page.locator('text=No results found')).toBeVisible()
    })

    test('should clear search when palette reopens', async ({ page }) => {
      await openCommandPalette(page)

      const input = page.locator('[class*="command-palette-input"]')
      await input.fill('export')

      // Close and reopen
      await closeCommandPalette(page)
      await openCommandPalette(page)

      // Search should be empty
      await expect(input).toHaveValue('')

      // All commands should be visible
      await expect(page.locator('text=View All Drafts')).toBeVisible()
      await expect(page.locator('text=Export All Drafts (JSON)')).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should navigate commands with arrow keys', async ({ page }) => {
      await openCommandPalette(page)

      // First item should be selected by default (cmdk uses role="option")
      const firstItem = page.locator('[role="option"]').first()
      await expect(firstItem).toHaveAttribute('aria-selected', 'true')

      // Navigate down
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(100)

      // Second item should be selected
      const secondItem = page.locator('[role="option"]').nth(1)
      await expect(secondItem).toHaveAttribute('aria-selected', 'true')

      // Navigate back up
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(100)

      // First item should be selected again
      await expect(firstItem).toHaveAttribute('aria-selected', 'true')
    })

    test('should execute command with Enter', async ({ page }) => {
      // Add some drafts
      const drafts = createMockDrafts(2)
      drafts[0].favorite = true

      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await openCommandPalette(page)

      // Search for "View Favorites"
      const input = page.locator('[class*="command-palette-input"]')
      await input.fill('favorites')

      // Press Enter to execute
      await page.keyboard.press('Enter')

      // Should close palette and switch to Favorites tab
      await page.waitForTimeout(500)

      const palette = page.locator('[class*="command-palette"]')
      const isVisible = await palette.isVisible().catch(() => false)
      expect(isVisible).toBe(false)

      // Should be on Favorites tab (verify by checking active tab)
      const favoritesTab = page.locator('[role="tab"]:has-text("Favorites")')
      await expect(favoritesTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  test.describe('Command Execution', () => {
    test('should execute "View All Drafts" command', async ({ page }) => {
      const drafts = createMockDrafts(2)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      // Start on Favorites tab
      await page.locator('[role="tab"]:has-text("Favorites")').click()
      await page.waitForTimeout(300)

      await openCommandPalette(page)

      // Click "View All Drafts"
      await page.locator('text=View All Drafts').click()

      // Should switch to All tab
      await page.waitForTimeout(300)
      const allTab = page.locator('[role="tab"]:has-text("All")')
      await expect(allTab).toHaveAttribute('aria-selected', 'true')
    })

    test('should execute "View Favorites" command', async ({ page }) => {
      const favoriteDraft = createMockFavoriteDraft()
      await addDraftToStorage(page, favoriteDraft)

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      await openCommandPalette(page)

      // Click "View Favorites"
      await page.locator('text=View Favorites').click()

      // Should switch to Favorites tab
      await page.waitForTimeout(300)
      const favoritesTab = page.locator('[role="tab"]:has-text("Favorites")')
      await expect(favoritesTab).toHaveAttribute('aria-selected', 'true')
    })

    test('should execute "Import" command', async ({ page }) => {
      await openCommandPalette(page)

      // Set up file chooser promise before clicking
      const fileChooserPromise = page.waitForEvent('filechooser')

      // Click Import command
      await page.locator('text=Import Drafts from JSON').click()

      // File chooser should open
      const fileChooser = await fileChooserPromise
      expect(fileChooser).toBeTruthy()
    })

    test('should execute "Delete All Drafts" command', async ({ page }) => {
      const drafts = createMockDrafts(2)
      for (const draft of drafts) {
        await addDraftToStorage(page, draft)
      }

      await page.reload()
      await page.waitForSelector('text=Reddit Drafter', { timeout: 5000 })
      await page.waitForTimeout(1000)

      confirmDialog(page)

      await openCommandPalette(page)

      // Click Delete All Drafts
      await page.locator('text=Delete All Drafts').click()

      // Wait for confirmation and execution
      await page.waitForTimeout(1000)

      // Should show empty state
      await expect(page.locator('text=No drafts found')).toBeVisible()
    })
  })

  test.describe('Groups', () => {
    test('should display commands in groups', async ({ page }) => {
      await openCommandPalette(page)

      // Should see group headings
      await expect(page.locator('text=Navigation')).toBeVisible()
      await expect(page.locator('text=Actions')).toBeVisible()
      await expect(page.locator('text=Danger')).toBeVisible()
    })

    test('should show shortcuts for commands', async ({ page }) => {
      await openCommandPalette(page)

      // Some commands should display shortcuts
      const viewAllCommand = page.locator('text=View All Drafts').locator('..')
      await expect(viewAllCommand.locator('kbd')).toContainText('Alt+A')

      const viewFavoritesCommand = page.locator('text=View Favorites').locator('..')
      await expect(viewFavoritesCommand.locator('kbd')).toContainText('Alt+F')
    })
  })
})
