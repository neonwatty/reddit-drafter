import { db } from './db'
import type { MediaFile } from '../types'
import { v4 as uuid } from 'uuid'

export async function createMediaFile(media: Omit<MediaFile, 'id' | 'uploadedAt'>): Promise<MediaFile> {
  const newMedia: MediaFile = {
    ...media,
    id: uuid(),
    uploadedAt: Date.now()
  }

  await db.media.add(newMedia)
  return newMedia
}

export async function getMediaForDraft(draftId: string): Promise<MediaFile[]> {
  return db.media.where('draftId').equals(draftId).sortBy('order')
}

export async function deleteMediaFile(id: string): Promise<void> {
  await db.media.delete(id)
}
