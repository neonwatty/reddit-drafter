import { ScrollArea } from '@/components/ui/scroll-area'
import DraftCard from './DraftCard'
import type { RedditDraft } from '@/lib/types'

interface DraftListProps {
  drafts: RedditDraft[]
  loading?: boolean
  onEdit?: (draft: RedditDraft) => void
  onDelete?: (draft: RedditDraft) => void
  onToggleFavorite?: (draft: RedditDraft) => void
  onExport?: (draft: RedditDraft) => void
  onDuplicate?: (draft: RedditDraft) => void
}

export default function DraftList({
  drafts,
  loading,
  onEdit,
  onDelete,
  onToggleFavorite,
  onExport,
  onDuplicate,
}: DraftListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-sm text-muted-foreground">Loading drafts...</p>
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center px-4">
        <p className="text-sm text-muted-foreground mb-2">No drafts found</p>
        <p className="text-xs text-muted-foreground">
          Save your first draft from a Reddit submit page
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(600px-220px)]">
      <div className="space-y-3 pr-4">
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onExport={onExport}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
