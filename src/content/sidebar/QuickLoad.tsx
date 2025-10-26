import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RedditDraft } from '@/lib/types'

interface QuickLoadProps {
  draft: RedditDraft
  onLoad?: (draft: RedditDraft) => void
}

export default function QuickLoad({ draft, onLoad }: QuickLoadProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFormHasContent = (): boolean => {
    // TODO: Implement in Phase 3 - check if Reddit form has content
    // For now, always show warning
    return true
  }

  const handleLoad = async () => {
    if (checkFormHasContent()) {
      setShowWarning(true)
    } else {
      await loadDraft()
    }
  }

  const loadDraft = async () => {
    setLoading(true)
    try {
      // TODO: Implement in Phase 3 - populate Reddit form
      console.log('[QuickLoad] Loading draft:', draft)
      onLoad?.(draft)
      setShowWarning(false)
    } catch (error) {
      console.error('[QuickLoad] Failed to load draft:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleLoad}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <FileDown className="mr-2 h-4 w-4" />
        Load
      </Button>

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current content?</DialogTitle>
            <DialogDescription>
              The form already has content. Loading this draft will replace it.
              Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarning(false)}>
              Cancel
            </Button>
            <Button onClick={loadDraft} disabled={loading}>
              {loading ? 'Loading...' : 'Load Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
