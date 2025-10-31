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
 * Generate a thumbnail from an image file
 */
async function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const maxSize = 256

        // Calculate dimensions maintaining aspect ratio
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.6)

        // Clean up
        URL.revokeObjectURL(img.src)
        resolve(thumbnail)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
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

  // Generate thumbnail for display in popup UI (256x256, JPEG 0.6)
  let thumbnail: string | undefined
  try {
    thumbnail = await generateImageThumbnail(file)
    const thumbnailSize = thumbnail ? thumbnail.length : 0
    console.log(`[processAndSaveImage] ✓ Generated thumbnail for ${file.name}:`, thumbnailSize, 'bytes')
  } catch (error) {
    console.error('[processAndSaveImage] ✗ Failed to generate thumbnail:', error)
    // Continue without thumbnail - not critical
  }

  // Log what we're about to save
  console.log('[processAndSaveImage] Saving media with:', {
    name: file.name,
    draftId,
    hasThumbnail: !!thumbnail,
    thumbnailLength: thumbnail ? thumbnail.length : 0
  })

  // Create media record using createMediaFile from storage
  const media = await createMediaFile({
    draftId,
    name: file.name,
    type: compressed.type,
    size: compressed.size,
    dataUrl,
    thumbnail,
    captionText,
    captionUrl,
    order,
  })

  console.log('[processAndSaveImage] Media saved, returned object has thumbnail:', !!media.thumbnail)

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

/**
 * Convert a data URL to a File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  // Extract MIME type and base64 data
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}

/**
 * Download an image from a URL and convert to File
 */
export async function downloadImageFromUrl(url: string, filename?: string): Promise<File> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()
    const name = filename || url.split('/').pop() || 'image.jpg'

    return new File([blob], name, { type: blob.type })
  } catch (error) {
    console.error('[downloadImageFromUrl] Failed to download image:', error)
    throw error
  }
}

/**
 * Programmatically inject files using drag-and-drop simulation
 * HTMLInputElement.files is read-only for security, so we simulate drag-drop instead
 */
export async function injectFileIntoInput(
  input: HTMLInputElement,
  file: File | File[]
): Promise<void> {
  try {
    const files = Array.isArray(file) ? file : [file]

    console.log('[injectFileIntoInput] Injecting', files.length, 'files via drag-drop simulation:', files.map(f => f.name).join(', '))

    // Create DataTransfer with files
    const dataTransfer = new DataTransfer()
    for (const f of files) {
      dataTransfer.items.add(f)
    }

    // Find the target element for drop events
    // Try the input first, then its parent (some UIs have a drop zone wrapper)
    const dropTarget = input.parentElement || input
    console.log('[injectFileIntoInput] Drop target:', dropTarget.tagName, dropTarget.className)

    // Simulate drag-and-drop sequence
    // 1. dragenter - mouse enters drop zone with files
    const dragenterEvent = new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    })
    dropTarget.dispatchEvent(dragenterEvent)
    console.log('[injectFileIntoInput] Dispatched dragenter event')

    await new Promise(resolve => setTimeout(resolve, 50))

    // 2. dragover - mouse is over drop zone (required for drop to work)
    const dragoverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    })
    dropTarget.dispatchEvent(dragoverEvent)
    console.log('[injectFileIntoInput] Dispatched dragover event')

    await new Promise(resolve => setTimeout(resolve, 50))

    // 3. drop - files are dropped
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    })
    dropTarget.dispatchEvent(dropEvent)
    console.log('[injectFileIntoInput] Dispatched drop event')

    await new Promise(resolve => setTimeout(resolve, 100))

    // Also try dispatching on the input itself
    const inputDropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    })
    input.dispatchEvent(inputDropEvent)
    console.log('[injectFileIntoInput] Dispatched drop event on input')

    // Fallback: Also dispatch change event on input (some handlers might listen for this)
    const changeEvent = new Event('change', { bubbles: true })
    Object.defineProperty(changeEvent, 'dataTransfer', {
      value: dataTransfer,
      writable: false
    })
    input.dispatchEvent(changeEvent)
    console.log('[injectFileIntoInput] Dispatched change event with dataTransfer')

    // Give React time to process
    await new Promise(resolve => setTimeout(resolve, 100))

    console.log('[injectFileIntoInput] Drag-drop simulation complete')
  } catch (error) {
    console.error('[injectFileIntoInput] Failed to inject file via drag-drop:', error)
    throw error
  }
}
