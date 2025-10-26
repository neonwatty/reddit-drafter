import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { createDraft } from '@/lib/storage/drafts'
import type { RedditDraft } from '@/lib/types'

interface QuickSaveProps {
  onSave?: (draft: RedditDraft) => void
}

export default function QuickSave({ onSave }: QuickSaveProps) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)

    try {
      // TODO: Parse Reddit form in Phase 3
      // For now, create a minimal test draft
      const draft = await createDraft({
        title: 'Test Draft',
        body: 'This is a test draft from Phase 2',
        subreddit: 'test',
        postType: 'text',
        nsfw: false,
        spoiler: false,
        oc: false,
        sendReplies: true,
        postToProfile: false,
        redditUsername: 'unknown',
        tags: [],
        notes: '',
        favorite: false
      })

      toast.success('Draft saved successfully!')
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
