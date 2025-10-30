import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { FileText, X } from 'lucide-react'
import QuickSave from './QuickSave'
import RecentDrafts from './RecentDrafts'
import { initStorage } from '@/lib/storage/db'
import { listDrafts } from '@/lib/storage/drafts'

export default function RedditSidebarApp() {
  const [open, setOpen] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize storage
  useEffect(() => {
    initStorage().then(() => {
      setStorageReady(true)
      console.log('[RedditSidebarApp] Storage initialized')
    })
  }, [])

  // Fetch draft count
  useEffect(() => {
    if (storageReady) {
      listDrafts().then((drafts) => {
        setDraftCount(drafts.length)
      }).catch((error) => {
        console.error('[RedditSidebarApp] Failed to fetch drafts:', error)
      })
    }
  }, [storageReady, open])

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      // ESC to close
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [open])

  return (
    <div ref={containerRef}>
      {/* Floating Action Button */}
      <div className="fixed top-6 right-6 z-[9999]">
        <Button
          onClick={() => setOpen(!open)}
          className="rounded-full h-12 px-6 shadow-lg hover:scale-105 transition-all bg-[#FF4500] hover:bg-[#FF5722] text-white relative"
          title="Open Reddit Drafter (Ctrl+Shift+D)"
        >
          <FileText className="h-5 w-5 mr-2" />
          <span className="font-semibold hidden sm:inline">Reddit Drafter</span>
          <span className="font-semibold sm:hidden">Drafts</span>
          {/* Draft count badge */}
          {draftCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
              {draftCount}
            </span>
          )}
        </Button>
      </div>

      {/* Sidebar using shadcn/ui Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reddit Drafter
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Save and manage Reddit post drafts
            </SheetDescription>
          </SheetHeader>

          {!storageReady ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Initializing...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Save Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Save Current Post</h3>
                <QuickSave onSave={() => {
                  // Refresh recent drafts by changing the key
                  setRefreshKey(prev => prev + 1)
                }} />
              </div>

              {/* Recent Drafts Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Drafts</h3>
                <RecentDrafts
                  key={refreshKey}
                  onLoad={() => {
                    // Close sidebar after loading
                    setOpen(false)
                  }}
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t">
                <p className="text-xs text-center text-muted-foreground">
                  Press <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Shift+D</kbd> to toggle
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
