import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X } from 'lucide-react'
import { updateDraft } from '@/lib/storage/drafts'
import { validateDraft } from '@/lib/utils/validation'
import { toast } from 'sonner'
import MediaUploader from './MediaUploader'
import MediaGallery from './MediaGallery'
import type { RedditDraft, MediaFile } from '@/lib/types'

interface DraftEditorProps {
  draft: RedditDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export default function DraftEditor({
  draft,
  open,
  onOpenChange,
  onSaved,
}: DraftEditorProps) {
  const [formData, setFormData] = useState<Partial<RedditDraft>>({})
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [mediaRefreshKey, setMediaRefreshKey] = useState(0)
  const [mediaCount, setMediaCount] = useState(0)

  // Reset form when draft changes
  useEffect(() => {
    if (draft) {
      setFormData(draft)
      setMediaCount(0)
      setMediaRefreshKey((key) => key + 1)
    } else {
      setFormData({})
      setMediaCount(0)
      setMediaRefreshKey(0)
    }
  }, [draft])

  const refreshMedia = useCallback(() => {
    setMediaRefreshKey((key) => key + 1)
  }, [])

  const handleMediaLoaded = useCallback(
    (items: MediaFile[]) => {
      setMediaCount(items.length)

      // Update formData with current media IDs
      if (items.length > 0) {
        const mediaIds = items.map((m) => m.id)

        // Update imageIds for gallery and image posts
        if (
          formData.postType === 'gallery' ||
          (formData.postType === 'image' && items.length > 0)
        ) {
          setFormData((prev) => ({
            ...prev,
            imageIds: mediaIds,
          }))
        }

        // Update videoId for video posts
        if (formData.postType === 'video' && items.length > 0) {
          setFormData((prev) => ({
            ...prev,
            videoId: items[0].id,
          }))
        }
      } else {
        // Clear media IDs if no media
        setFormData((prev) => ({
          ...prev,
          imageIds: undefined,
          videoId: undefined,
        }))
      }
    },
    [formData.postType]
  )

  const handleSave = async () => {
    if (!draft) return

    setSaving(true)

    try {
      // Validate draft
      const validation = validateDraft({
        title: formData.title || '',
        subreddit: formData.subreddit || '',
        postType: formData.postType || 'text',
        link: formData.link,
        pollOptions: formData.pollOptions,
        pollDuration: formData.pollDuration,
      })

      // Block save if validation fails
      if (!validation.valid) {
        console.warn('[DraftEditor] Draft validation failed:', validation.errors)
        toast.error(`Cannot save: ${validation.errors.join(', ')}`, { duration: 5000 })
        setSaving(false)
        return
      }

      // Update draft
      await updateDraft(draft.id, {
        ...formData,
        updatedAt: Date.now(),
      })

      toast.success('Draft updated successfully!')
      if (validation.warnings.length) {
        toast.warning(`Warnings: ${validation.warnings.join(', ')}`)
      }
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('[DraftEditor] Failed to save draft:', error)
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = () => {
    if (!tagInput.trim()) return
    const currentTags = formData.tags || []
    if (!currentTags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...currentTags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: (formData.tags || []).filter((t) => t !== tag),
    })
  }

  if (!draft) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Draft</DialogTitle>
          <DialogDescription>
            Make changes to your draft. Changes are saved to local storage.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Post title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subreddit">Subreddit</Label>
              <Input
                id="subreddit"
                value={formData.subreddit || ''}
                onChange={(e) =>
                  setFormData({ ...formData, subreddit: e.target.value })
                }
                placeholder="e.g., AskReddit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postType">Post Type</Label>
              <Select
                value={formData.postType || 'text'}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, postType: value })
                }
              >
                <SelectTrigger id="postType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                  <SelectItem value="gallery">Gallery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.postType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  value={formData.body || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  placeholder="Post content (markdown supported)"
                  rows={10}
                />
              </div>
            )}

            {formData.postType === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="link">URL</Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.link || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
            )}
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="nsfw">NSFW</Label>
              <Switch
                id="nsfw"
                checked={formData.nsfw || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, nsfw: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="spoiler">Spoiler</Label>
              <Switch
                id="spoiler"
                checked={formData.spoiler || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, spoiler: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="oc">Original Content (OC)</Label>
              <Switch
                id="oc"
                checked={formData.oc || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, oc: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sendReplies">Send replies to inbox</Label>
              <Switch
                id="sendReplies"
                checked={formData.sendReplies ?? true}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sendReplies: checked })
                }
              />
            </div>

            {formData.flair && (
              <div className="space-y-2">
                <Label>Flair</Label>
                <div className="p-3 border rounded-md bg-accent/50">
                  <p className="text-sm font-medium">{formData.flair.text}</p>
                  {formData.flair.templateId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Template: {formData.flair.templateId}
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            {draft && (
              <MediaGallery
                draftId={draft.id}
                refreshKey={mediaRefreshKey}
                onMediaLoaded={handleMediaLoaded}
              />
            )}

            {(formData.postType === 'image' ||
              formData.postType === 'video' ||
              formData.postType === 'gallery') && draft && (
              <MediaUploader
                draftId={draft.id}
                postType={formData.postType as 'image' | 'video' | 'gallery'}
                existingMediaCount={mediaCount}
                onMediaAdded={refreshMedia}
              />
            )}

            {formData.postType !== 'image' &&
              formData.postType !== 'video' &&
              formData.postType !== 'gallery' && (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">
                    Media uploads are available for Image, Video, and Gallery post types.
                  </p>
                  <p className="text-xs mt-2">
                    Change the post type in the Content tab to enable uploading new media.
                  </p>
                </div>
              )}
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add a tag..."
                />
                <Button onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Private notes about this draft..."
                rows={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="favorite">Favorite</Label>
              <Switch
                id="favorite"
                checked={formData.favorite || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, favorite: checked })
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
