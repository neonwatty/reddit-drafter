/**
 * Storage using chrome.storage.local API
 * This is shared across all extension contexts (content scripts, popup, background)
 */
import { db } from './chrome-storage'

export { db }

/**
 * Initialize storage
 */
export async function initStorage() {
  try {
    await db.open()
    console.log('[Storage] chrome.storage.local initialized successfully')
    return { type: 'chrome-storage' as const, db }
  } catch (error) {
    console.error('[Storage] Failed to initialize storage:', error)
    throw error
  }
}

/**
 * Check storage quota and warn user
 */
export async function checkStorageQuota() {
  try {
    const quotaInfo = await db.getQuotaInfo()

    if (quotaInfo.percentUsed > 80) {
      return {
        warning: true,
        message: `Storage is ${quotaInfo.percentUsed.toFixed(1)}% full. Consider deleting old drafts or exporting to free up space.`,
        usage: quotaInfo.usage,
        quota: quotaInfo.quota
      }
    }

    return { warning: false }
  } catch (error) {
    console.error('[Storage] Failed to check quota:', error)
    return { warning: false }
  }
}
