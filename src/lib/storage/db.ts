import Dexie, { Table } from 'dexie'
import type { RedditDraft, MediaFile } from '../types'

class DraftsDatabase extends Dexie {
  drafts!: Table<RedditDraft>
  media!: Table<MediaFile>

  constructor() {
    super('RedditDrafterDB')

    // Version 1: Initial schema
    this.version(1).stores({
      drafts: 'id, subreddit, postType, createdAt, updatedAt, *tags, favorite, redditUsername',
      media: 'id, draftId, uploadedAt'
    })
  }
}

export const db = new DraftsDatabase()

/**
 * Initialize storage with fallback to chrome.storage.local if IndexedDB fails
 */
export async function initStorage() {
  try {
    // Try to open IndexedDB
    await db.open()
    console.log('[Storage] IndexedDB initialized successfully')
    return { type: 'indexeddb' as const, db }
  } catch (error) {
    console.error('[Storage] IndexedDB failed to initialize:', error)

    // Fallback to chrome.storage.local (limited capacity)
    console.warn('[Storage] Falling back to chrome.storage.local')
    return { type: 'chrome-storage' as const }
  }
}

/**
 * Check storage quota and warn user
 */
export async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    const usagePercent = ((estimate.usage ?? 0) / (estimate.quota ?? 1)) * 100

    if (usagePercent > 80) {
      return {
        warning: true,
        message: `Storage is ${usagePercent.toFixed(1)}% full. Consider deleting old drafts or exporting to free up space.`,
        usage: estimate.usage,
        quota: estimate.quota
      }
    }
  }

  return { warning: false }
}
