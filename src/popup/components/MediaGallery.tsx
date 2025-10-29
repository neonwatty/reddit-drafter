import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Image, Video, ExternalLink } from 'lucide-react'
import { getDraftMedia, deleteDraftMedia, formatBytes } from '@/lib/utils/media'
import { toast } from 'sonner'
import type { MediaFile } from '@/lib/types'

interface MediaGalleryProps {
  draftId: string
  refreshKey?: number
  onMediaDeleted?: () => void
  onMediaLoaded?: (media: MediaFile[]) => void
}

export default function MediaGallery({
  draftId,
  refreshKey = 0,
  onMediaDeleted,
  onMediaLoaded,
}: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    try {
      const draftMedia = await getDraftMedia(draftId)
      setMedia(draftMedia)
      onMediaLoaded?.(draftMedia)
    } catch (error) {
      console.error('[MediaGallery] Failed to load media:', error)
    } finally {
      setLoading(false)
    }
  }, [draftId, onMediaLoaded])

  useEffect(() => {
    loadMedia()
  }, [loadMedia, refreshKey])

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Delete this media file?')) return

    try {
      await deleteDraftMedia(mediaId)
      toast.success('Media deleted')
      await loadMedia()
      onMediaDeleted?.()
    } catch (error) {
      console.error('[MediaGallery] Failed to delete media:', error)
      toast.error('Failed to delete media')
    }
  }

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Loading media...</p>
      </Card>
    )
  }

  if (media.length === 0) {
    return null
  }

  const totalSize = media.reduce((sum, m) => sum + m.size, 0)

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Attached Media</h3>
            <Badge variant="secondary" className="text-xs">
              {media.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{formatBytes(totalSize)}</p>
        </div>

        <div className="space-y-2">
          {media.map((item) => (
            <MediaItem
              key={item.id}
              media={item}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

interface MediaItemProps {
  media: MediaFile
  onDelete: () => void
}

function MediaItem({ media, onDelete }: MediaItemProps) {
  const isVideo = media.type.startsWith('video/')
  const displayThumbnail = isVideo ? media.thumbnail : media.dataUrl

  return (
    <div className="flex items-start gap-3 p-2 border rounded-lg hover:bg-accent/50">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 bg-muted rounded overflow-hidden">
        {displayThumbnail ? (
          <img
            src={displayThumbnail}
            alt={media.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isVideo ? (
              <Video className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Image className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{media.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {isVideo ? 'Video' : 'Image'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatBytes(media.size)}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={onDelete}
            aria-label="Remove media"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Caption (for gallery images) */}
        {media.captionText && (
          <div className="mt-2 text-xs text-muted-foreground">
            <p className="truncate">{media.captionText}</p>
            {media.captionUrl && (
              <a
                href={media.captionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {media.captionUrl}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
