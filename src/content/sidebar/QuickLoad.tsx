import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { loadDraftIntoForm } from '@/lib/reddit/injector'
import { getCurrentSubredditFromUrl, isOnSubmitPage, buildSubmitUrl } from '@/lib/utils/url-builder'
import { detectRedditVariant } from '@/lib/reddit/variant-detector'
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
      // Check if we're on a submit page
      if (!isOnSubmitPage()) {
        // Not on a submit page - offer to navigate
        const shouldNavigate = confirm(
          `This draft is for r/${draft.subreddit}.\n\nYou're not on a submit page. Navigate there now?`
        )

        if (shouldNavigate) {
          const variant = detectRedditVariant()
          const submitUrl = buildSubmitUrl(draft.subreddit, variant)

          // Store draft ID to load after navigation
          await chrome.storage.local.set({ pendingDraftLoad: draft.id })

          // Navigate
          window.location.href = submitUrl
          return
        } else {
          setLoading(false)
          return
        }
      }

      // Check if we're on the correct subreddit
      const currentSubreddit = getCurrentSubredditFromUrl()

      if (currentSubreddit && currentSubreddit !== draft.subreddit) {
        // Wrong subreddit - offer options
        const message = `This draft is for r/${draft.subreddit}, but you're on r/${currentSubreddit}.\n\nChoose an option:\nOK = Navigate to r/${draft.subreddit}\nCancel = Load anyway into r/${currentSubreddit}`

        if (confirm(message)) {
          // Navigate to correct subreddit
          const variant = detectRedditVariant()
          const submitUrl = buildSubmitUrl(draft.subreddit, variant)

          // Store draft ID to load after navigation
          await chrome.storage.local.set({ pendingDraftLoad: draft.id })

          // Navigate
          window.location.href = submitUrl
          return
        }
        // If they cancel, continue to load anyway (will update draft subreddit below)
      }

      // Load the draft (loadDraftIntoForm handles content check and warning internally)
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
