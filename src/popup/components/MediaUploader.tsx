import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Upload, Image, Video, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  processAndSaveImage,
  processAndSaveVideo,
  isValidImageType,
  isValidVideoType,
  validateFileSize,
  formatBytes,
  getDraftMedia,
} from '@/lib/utils/media'
import type { MediaFile } from '@/lib/types'

interface MediaUploaderProps {
  draftId: string
  postType: 'image' | 'video' | 'gallery'
  existingMediaCount?: number
  onMediaAdded?: (media: MediaFile) => void
}

export default function MediaUploader({
  draftId,
  postType,
  existingMediaCount = 0,
  onMediaAdded,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const selectedFiles =
      postType === 'gallery' ? Array.from(files) : [files[0]]

    if (selectedFiles.length === 0) {
      return
    }

    setUploading(true)

    try {
      let currentMediaCount =
        existingMediaCount || (await getDraftMedia(draftId)).length

      for (const file of selectedFiles) {
        // Validate file type
        const isImage = isValidImageType(file)
        const isVideo = isValidVideoType(file)

        if (postType === 'image' && !isImage) {
          toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)')
          continue
        }

        if (postType === 'video' && !isVideo) {
          toast.error('Please select a valid video file (MP4, WebM, MOV)')
          continue
        }

        if (postType === 'gallery' && !isImage) {
          toast.error('Gallery posts only support images')
          continue
        }

        // Validate file size
        const sizeValidation = validateFileSize(file)
        if (!sizeValidation.valid) {
          toast.error(sizeValidation.error)
          continue
        }

        const order = currentMediaCount

        // Process and save
        if (isImage) {
          setProgress('Compressing image...')
          const media = await processAndSaveImage(file, draftId, order)
          toast.success(`Image uploaded: ${formatBytes(media.size)}`)
          currentMediaCount += 1
          onMediaAdded?.(media)
        } else if (isVideo) {
          setProgress('Processing video...')
          const media = await processAndSaveVideo(file, draftId, order)
          toast.success(`Video uploaded: ${formatBytes(media.size)}`)
          currentMediaCount += 1
          onMediaAdded?.(media)
        }
      }
    } catch (error) {
      console.error('[MediaUploader] Upload failed:', error)
      toast.error('Failed to upload media')
    } finally {
      setUploading(false)
      setProgress('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const getAcceptedTypes = () => {
    switch (postType) {
      case 'image':
      case 'gallery':
        return 'image/jpeg,image/png,image/gif,image/webp'
      case 'video':
        return 'video/mp4,video/webm,video/quicktime'
      default:
        return '*'
    }
  }

  const getUploadText = () => {
    switch (postType) {
      case 'image':
        return 'Upload Image'
      case 'video':
        return 'Upload Video'
      case 'gallery':
        return existingMediaCount > 0 ? 'Add Another Image' : 'Upload Images'
      default:
        return 'Upload Media'
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {postType === 'video' ? (
            <Video className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Image className="h-4 w-4 text-muted-foreground" />
          )}
          <Label className="text-sm font-semibold">
            {postType === 'gallery' ? 'Gallery Images' : 'Media Upload'}
          </Label>
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypes()}
          onChange={handleFileSelect}
          className="hidden"
          multiple={postType === 'gallery'}
        />

        <Button
          onClick={handleClick}
          disabled={uploading}
          variant="outline"
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {progress}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {getUploadText()}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          {postType === 'image' && 'Max 20MB, supports JPEG, PNG, GIF, WebP'}
          {postType === 'video' && 'Max 1GB, supports MP4, WebM, MOV'}
          {postType === 'gallery' && 'Max 20MB per image, up to 20 images'}
        </p>

        {postType === 'gallery' && existingMediaCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {existingMediaCount} / 20 images added
          </p>
        )}
      </div>
    </Card>
  )
}
