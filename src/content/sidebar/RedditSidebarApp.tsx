import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { FileText, X } from 'lucide-react'
import { Toaster } from 'sonner'
import QuickSave from './QuickSave'
import RecentDrafts from './RecentDrafts'
import { initStorage } from '@/lib/storage/db'

export default function RedditSidebarApp() {
  const [open, setOpen] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize storage
  useEffect(() => {
    initStorage().then(() => {
      setStorageReady(true)
      console.log('[RedditSidebarApp] Storage initialized')
    })
  }, [])

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
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={() => setOpen(!open)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform"
          title="Toggle Reddit Drafter (Ctrl+Shift+D)"
        >
          <FileText className="h-6 w-6" />
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
                  // Refresh recent drafts after save
                  // This will be handled automatically when we add state management
                }} />
              </div>

              {/* Recent Drafts Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Drafts</h3>
                <RecentDrafts onLoad={() => {
                  // Close sidebar after loading
                  setOpen(false)
                }} />
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

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  )
}
