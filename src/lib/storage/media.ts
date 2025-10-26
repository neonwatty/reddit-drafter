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

export async function getMediaFile(id: string): Promise<MediaFile | undefined> {
  return db.media.get(id)
}

export async function getMediaForDraft(draftId: string): Promise<MediaFile[]> {
  return db.media.where('draftId').equals(draftId).sortBy('order')
}

export async function deleteMediaFile(id: string): Promise<void> {
  await db.media.delete(id)
}

export async function deleteMediaForDraft(draftId: string): Promise<void> {
  await db.media.where('draftId').equals(draftId).delete()
}

export async function updateMediaFile(id: string, updates: Partial<MediaFile>): Promise<void> {
  await db.media.update(id, updates)
}
