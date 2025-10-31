import { db } from './db'
import type { MediaFile } from '../types'
import { v4 as uuid } from 'uuid'

export async function createMediaFile(media: Omit<MediaFile, 'id' | 'uploadedAt'>): Promise<MediaFile> {
  const newMedia: MediaFile = {
    ...media,
    id: uuid(),
    uploadedAt: Date.now()
  }

  console.log('[createMediaFile] Saving to storage:', {
    id: newMedia.id,
    name: newMedia.name,
    draftId: newMedia.draftId,
    hasThumbnail: !!newMedia.thumbnail,
    thumbnailLength: newMedia.thumbnail ? newMedia.thumbnail.length : 0
  })

  await db.media.add(newMedia)

  console.log('[createMediaFile] ✓ Saved to storage successfully')

  return newMedia
}

export async function getMediaForDraft(draftId: string): Promise<MediaFile[]> {
  console.log('[getMediaForDraft] Retrieving media for draft:', draftId)
  const media = await db.media.where('draftId').equals(draftId).sortBy('order')

  console.log('[getMediaForDraft] Retrieved', media.length, 'media files:')
  media.forEach((m, i) => {
    console.log(`  [${i}] ${m.name}:`, {
      id: m.id,
      hasThumbnail: !!m.thumbnail,
      thumbnailLength: m.thumbnail ? m.thumbnail.length : 0
    })
  })

  return media
}

export async function deleteMediaFile(id: string): Promise<void> {
  await db.media.delete(id)
}

export async function updateMediaFile(id: string, updates: Partial<MediaFile>): Promise<void> {
  await db.media.update(id, updates)
}
