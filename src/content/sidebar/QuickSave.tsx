import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { createDraft } from '@/lib/storage/drafts'
import { detectRedditVariant } from '@/lib/reddit/variant-detector'
import { parseOldRedditForm } from '@/lib/reddit/parsers/parse-old'
import { parseNewRedditForm } from '@/lib/reddit/parsers/parse-new'
import { parseSHRedditForm } from '@/lib/reddit/parsers/parse-sh'
import { validateDraft } from '@/lib/utils/validation'
import type { RedditDraft } from '@/lib/types'

interface QuickSaveProps {
  onSave?: (draft: RedditDraft) => void
}

export default function QuickSave({ onSave }: QuickSaveProps) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)

    try {
      // Detect Reddit variant and parse form
      const variant = detectRedditVariant()
      console.log(`[QuickSave] Parsing form from ${variant} Reddit...`)

      let parsedData: Partial<RedditDraft>

      switch (variant) {
        case 'old':
          parsedData = parseOldRedditForm()
          break
        case 'new':
          parsedData = parseNewRedditForm()
          break
        case 'sh':
          parsedData = parseSHRedditForm()
          break
        default:
          throw new Error(`Unsupported Reddit variant: ${variant}`)
      }

      // Debug: log parsed data
      console.log('[QuickSave] Parsed data:', {
        title: parsedData.title,
        subreddit: parsedData.subreddit,
        postType: parsedData.postType,
        bodyLength: parsedData.body?.length || 0
      })

      // Validate draft
      const validation = validateDraft({
        title: parsedData.title || '',
        subreddit: parsedData.subreddit || '',
        postType: parsedData.postType || 'text',
        link: parsedData.link,
        pollOptions: parsedData.pollOptions,
        pollDuration: parsedData.pollDuration
      })

      // Block save if validation fails
      if (!validation.valid) {
        console.warn('[QuickSave] Draft validation failed:', validation.errors)
        toast.error(`Cannot save: ${validation.errors.join(', ')}`, { duration: 5000 })
        return
      }

      // Block if parsed content is completely empty
      const hasContent =
        !!(parsedData.title && parsedData.title.trim()) ||
        !!(parsedData.body && parsedData.body.trim()) ||
        !!(parsedData.link && parsedData.link.trim()) ||
        !!(parsedData.pollOptions && parsedData.pollOptions.some(opt => opt.text.trim())) ||
        !!parsedData.flair ||
        !!(parsedData.tags && parsedData.tags.length) ||
        !!(parsedData.notes && parsedData.notes.trim())

      if (!hasContent) {
        console.warn('[QuickSave] No content detected in form; aborting save')
        toast.error('No content detected to save')
        return
      }

      // Create draft
      const draft = await createDraft({
        title: parsedData.title || '',
        body: parsedData.body || '',
        subreddit: parsedData.subreddit || '',
        postType: parsedData.postType || 'text',
        link: parsedData.link,
        pollOptions: parsedData.pollOptions,
        pollDuration: parsedData.pollDuration,
        nsfw: parsedData.nsfw || false,
        spoiler: parsedData.spoiler || false,
        oc: parsedData.oc || false,
        sendReplies: parsedData.sendReplies ?? true,
        postToProfile: parsedData.postToProfile || false,
        redditUsername: parsedData.redditUsername || 'unknown',
        tags: parsedData.tags || [],
        notes: parsedData.notes || '',
        favorite: parsedData.favorite || false,
        flair: parsedData.flair
      })

      // Notify popup to refresh
      chrome.runtime.sendMessage({ type: 'DRAFT_SAVED' }).catch(() => {
        // Popup might not be open, that's okay
      })

      toast.success(`Draft "${draft.title || 'Untitled'}" saved successfully!`)
      onSave?.(draft)
    } catch (error) {
      console.error('[QuickSave] Failed to save draft:', error)
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Draft'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Ctrl+Shift+S
      </p>
    </div>
  )
}
