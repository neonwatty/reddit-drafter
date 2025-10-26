import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { loadDraftIntoForm } from '@/lib/reddit/injector'
import type { RedditDraft } from '@/lib/types'

interface QuickLoadProps {
  draft: RedditDraft
  onLoad?: (draft: RedditDraft) => void
}

export default function QuickLoad({ draft, onLoad }: QuickLoadProps) {
  const [loading, setLoading] = useState(false)

  const handleLoad = async () => {
    setLoading(true)

    try {
      // loadDraftIntoForm handles the content check and warning internally
      const result = await loadDraftIntoForm(draft, false)

      if (result.success) {
        toast.success(`Draft "${draft.title}" loaded successfully!`)

        // Show media warning if draft has attached media
        if (result.hasMedia && result.mediaCount) {
          setTimeout(() => {
            toast.info(
              `This draft has ${result.mediaCount} media file(s). You'll need to upload them manually to Reddit.`,
              { duration: 5000 }
            )
          }, 500)
        }

        onLoad?.(draft)
      } else if (result.error !== 'User cancelled') {
        toast.error(result.error || 'Failed to load draft')
      }
    } catch (error) {
      console.error('[QuickLoad] Failed to load draft:', error)
      toast.error('Failed to load draft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLoad}
      disabled={loading}
      variant="outline"
      size="sm"
      className="w-full"
    >
      <FileDown className="mr-2 h-4 w-4" />
      {loading ? 'Loading...' : 'Load'}
    </Button>
  )
}
