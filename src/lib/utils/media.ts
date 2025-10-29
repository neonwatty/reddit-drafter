import imageCompression from 'browser-image-compression'
import type { MediaFile } from '../types'
import { createMediaFile, getMediaForDraft, deleteMediaFile } from '../storage/media'

/**
 * Compression options for images
 */
const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1, // Max 1MB per image
  maxWidthOrHeight: 1920, // Max 1920px
  useWebWorker: true,
  initialQuality: 0.8,
}

/**
 * Compress an image file
 */
async function compressImage(file: File): Promise<File> {
  try {
    const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS)
    console.log(`[compressImage] Original: ${(file.size / 1024 / 1024).toFixed(2)}MB, Compressed: ${(compressed.size / 1024 / 1024).toFixed(2)}MB`)
    return compressed
  } catch (error) {
    console.error('[compressImage] Compression failed:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Generate a thumbnail from a video file
 */
async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of video, whichever is less
      const seekTime = Math.min(1, video.duration * 0.1)
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = (video.videoHeight / video.videoWidth) * 320

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7)

        // Clean up
        URL.revokeObjectURL(video.src)
        resolve(thumbnail)
      } catch (error) {
        reject(error)
      }
    }

    video.onerror = () => {
      reject(new Error('Failed to load video'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Convert a File to a data URL
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Process and save an image file
 */
export async function processAndSaveImage(
  file: File,
  draftId: string,
  order: number,
  captionText?: string,
  captionUrl?: string
): Promise<MediaFile> {
  // Compress image
  const compressed = await compressImage(file)

  // Convert to data URL
  const dataUrl = await fileToDataUrl(compressed)

  // Create media record using createMediaFile from storage
  const media = await createMediaFile({
    draftId,
    name: file.name,
    type: compressed.type,
    size: compressed.size,
    dataUrl,
    captionText,
    captionUrl,
    order,
  })

  return media
}

/**
 * Process and save a video file
 */
export async function processAndSaveVideo(
  file: File,
  draftId: string,
  order: number
): Promise<MediaFile> {
  // Generate thumbnail (fallback to undefined if it fails)
  let thumbnail: string | undefined
  try {
    thumbnail = await generateVideoThumbnail(file)
  } catch (error) {
    console.warn('[processAndSaveVideo] Failed to generate thumbnail, continuing without thumbnail.', error)
  }

  // Convert video to data URL
  const dataUrl = await fileToDataUrl(file)

  // Create media record using createMediaFile from storage
  const media = await createMediaFile({
    draftId,
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
    thumbnail,
    order,
  })

  return media
}

/**
 * Validate file type
 */
export function isValidImageType(file: File): boolean {
  return file.type.startsWith('image/') &&
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
}

export function isValidVideoType(file: File): boolean {
  return file.type.startsWith('video/') &&
    ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
}

/**
 * Validate file size (Reddit limits: 20MB for images, 1GB for videos)
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const isImage = isValidImageType(file)
  const isVideo = isValidVideoType(file)

  if (isImage) {
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Image must be under 20MB' }
    }
  }

  if (isVideo) {
    const maxSize = 1024 * 1024 * 1024 // 1GB
    if (file.size > maxSize) {
      return { valid: false, error: 'Video must be under 1GB' }
    }
  }

  return { valid: true }
}

/**
 * Get all media for a draft
 */
export async function getDraftMedia(draftId: string): Promise<MediaFile[]> {
  const media = await getMediaForDraft(draftId)
  return media.sort((a: MediaFile, b: MediaFile) => a.order - b.order)
}

/**
 * Delete a media file
 */
export async function deleteDraftMedia(mediaId: string): Promise<void> {
  await deleteMediaFile(mediaId)
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
