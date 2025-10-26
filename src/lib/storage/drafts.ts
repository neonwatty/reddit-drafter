import { db } from './db'
import type { RedditDraft, DraftFilters } from '../types'
import { v4 as uuid } from 'uuid'

export async function createDraft(draft: Omit<RedditDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<RedditDraft> {
  const newDraft: RedditDraft = {
    ...draft,
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  await db.drafts.add(newDraft)
  return newDraft
}

export async function updateDraft(id: string, updates: Partial<RedditDraft>): Promise<void> {
  await db.drafts.update(id, {
    ...updates,
    updatedAt: Date.now()
  })
}

export async function deleteDraft(id: string): Promise<void> {
  // Delete associated media first
  await db.media.where('draftId').equals(id).delete()
  // Then delete draft
  await db.drafts.delete(id)
}

export async function getDraft(id: string): Promise<RedditDraft | undefined> {
  return db.drafts.get(id)
}

export async function listDrafts(filters?: DraftFilters): Promise<RedditDraft[]> {
  let query = db.drafts.toCollection()

  // Apply indexed filters if provided
  if (filters?.subreddit) {
    query = db.drafts.where('subreddit').equals(filters.subreddit)
  } else if (filters?.postType) {
    query = db.drafts.where('postType').equals(filters.postType)
  }

  // Get all results and apply additional filters
  let results = await query.toArray()

  // Filter by favorite (not indexed, so filter in-memory)
  if (filters?.favorite) {
    results = results.filter(draft => draft.favorite === true)
  }

  // Filter by tags if provided
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter(draft =>
      filters.tags!.some(tag => draft.tags.includes(tag))
    )
  }

  // Filter by search query (title or body)
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    results = results.filter(draft =>
      draft.title.toLowerCase().includes(query) ||
      draft.body.toLowerCase().includes(query)
    )
  }

  // Filter by date range
  if (filters?.dateRange) {
    results = results.filter(draft =>
      draft.createdAt >= filters.dateRange!.start &&
      draft.createdAt <= filters.dateRange!.end
    )
  }

  // Sort by updated date (newest first)
  return results.sort((a, b) => b.updatedAt - a.updatedAt)
}
