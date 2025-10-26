import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { listDrafts } from '@/lib/storage/drafts'
import QuickLoad from './QuickLoad'
import type { RedditDraft } from '@/lib/types'

interface RecentDraftsProps {
  onLoad?: (draft: RedditDraft) => void
}

export default function RecentDrafts({ onLoad }: RecentDraftsProps) {
  const [drafts, setDrafts] = useState<RedditDraft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentDrafts()
  }, [])

  const loadRecentDrafts = async () => {
    try {
      const allDrafts = await listDrafts()
      // Show only the 5 most recent
      setDrafts(allDrafts.slice(0, 5))
    } catch (error) {
      console.error('[RecentDrafts] Failed to load drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading drafts...</p>
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">No drafts yet</p>
        <p className="text-xs text-muted-foreground">
          Save your first draft to see it here
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {drafts.map((draft) => (
          <Card key={draft.id} className="p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {draft.title || '(Untitled)'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    r/{draft.subreddit} • {draft.postType} • {formatDate(draft.updatedAt)}
                  </p>
                </div>
              </div>
              {draft.body && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {draft.body}
                </p>
              )}
              <QuickLoad draft={draft} onLoad={onLoad} />
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
