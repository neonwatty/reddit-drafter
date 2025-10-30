/**
 * Chrome Storage adapter that mimics Dexie API
 * Uses chrome.storage.local which is shared across all extension contexts
 */

import type { RedditDraft, MediaFile } from '../types'

const STORAGE_KEYS = {
  DRAFTS: 'drafts',
  MEDIA: 'media',
} as const

/**
 * Interface for objects that can be queried
 */
export interface Queryable<T> {
  toArray(): Promise<T[]>
}

/**
 * Collection class that mimics Dexie's Table API
 */
class StorageCollection<T extends { id: string }> implements Queryable<T> {
  constructor(private storageKey: string) {}

  async add(item: T): Promise<string> {
    const items = await this.getAll()
    items[item.id] = item
    await chrome.storage.local.set({ [this.storageKey]: items })
    return item.id
  }

  async update(id: string, updates: Partial<T>): Promise<number> {
    const items = await this.getAll()
    if (items[id]) {
      items[id] = { ...items[id], ...updates }
      await chrome.storage.local.set({ [this.storageKey]: items })
      return 1
    }
    return 0
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll()
    delete items[id]
    await chrome.storage.local.set({ [this.storageKey]: items })
  }

  async clear(): Promise<void> {
    await chrome.storage.local.set({ [this.storageKey]: {} })
  }

  async get(id: string): Promise<T | undefined> {
    const items = await this.getAll()
    return items[id]
  }

  async getAll(): Promise<Record<string, T>> {
    const result = await chrome.storage.local.get(this.storageKey)
    return result[this.storageKey] || {}
  }

  async toArray(): Promise<T[]> {
    const items = await this.getAll()
    return Object.values(items)
  }

  toCollection(): this {
    return this
  }

  where(field: keyof T): WhereClause<T> {
    return new WhereClause(this, field)
  }
}

/**
 * WhereClause for filtering collections
 */
class WhereClause<T extends { id: string }> {
  constructor(
    private collection: StorageCollection<T>,
    private field: keyof T
  ) {}

  equals(value: any): QueryResult<T> {
    return new QueryResult(this.collection, this.field, value)
  }
}

/**
 * QueryResult for filtered data
 */
class QueryResult<T extends { id: string }> implements Queryable<T> {
  constructor(
    private collection: StorageCollection<T>,
    private field: keyof T,
    private value: any
  ) {}

  async toArray(): Promise<T[]> {
    const items = await this.collection.toArray()
    return items.filter(item => item[this.field] === this.value)
  }

  async delete(): Promise<void> {
    const items = await this.collection.getAll()
    const filtered = Object.values(items).filter(
      item => item[this.field] !== this.value
    )
    const newItems: Record<string, T> = {}
    filtered.forEach(item => {
      newItems[item.id] = item
    })
    const storageKey = (this.collection as any).storageKey
    await chrome.storage.local.set({ [storageKey]: newItems })
  }

  async sortBy(sortField: keyof T): Promise<T[]> {
    const items = await this.toArray()
    return items.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal)
      }
      return 0
    })
  }
}

/**
 * Chrome Storage Database
 */
class ChromeStorageDB {
  drafts: StorageCollection<RedditDraft>
  media: StorageCollection<MediaFile>

  constructor() {
    this.drafts = new StorageCollection<RedditDraft>(STORAGE_KEYS.DRAFTS)
    this.media = new StorageCollection<MediaFile>(STORAGE_KEYS.MEDIA)
  }

  async open() {
    // Initialize storage if needed
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.DRAFTS,
      STORAGE_KEYS.MEDIA,
    ])

    if (!result[STORAGE_KEYS.DRAFTS]) {
      await chrome.storage.local.set({ [STORAGE_KEYS.DRAFTS]: {} })
    }
    if (!result[STORAGE_KEYS.MEDIA]) {
      await chrome.storage.local.set({ [STORAGE_KEYS.MEDIA]: {} })
    }

    console.log('[ChromeStorageDB] Storage initialized')
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<{
    usage: number
    quota: number
    percentUsed: number
  }> {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        // chrome.storage.local has QUOTA_BYTES = 10MB in most cases
        const quota = chrome.storage.local.QUOTA_BYTES || 10485760 // 10MB fallback
        const percentUsed = (bytesInUse / quota) * 100

        resolve({
          usage: bytesInUse,
          quota,
          percentUsed,
        })
      })
    })
  }
}

export const db = new ChromeStorageDB()
