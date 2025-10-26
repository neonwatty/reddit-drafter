import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Link2,
  Image,
  Video,
  BarChart3,
  Images,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Copy,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { RedditDraft } from '@/lib/types'

interface DraftCardProps {
  draft: RedditDraft
  onEdit?: (draft: RedditDraft) => void
  onDelete?: (draft: RedditDraft) => void
  onToggleFavorite?: (draft: RedditDraft) => void
  onExport?: (draft: RedditDraft) => void
  onDuplicate?: (draft: RedditDraft) => void
}

const POST_TYPE_ICONS = {
  text: FileText,
  link: Link2,
  image: Image,
  video: Video,
  poll: BarChart3,
  gallery: Images,
}

export default function DraftCard({
  draft,
  onEdit,
  onDelete,
  onToggleFavorite,
  onExport,
  onDuplicate,
}: DraftCardProps) {
  const [showFullBody, setShowFullBody] = useState(false)

  const Icon = POST_TYPE_ICONS[draft.postType] || FileText
  const bodyPreview = draft.body?.slice(0, 100) || ''
  const hasMoreBody = draft.body && draft.body.length > 100

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start gap-2 mb-2">
            <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-1 break-words">
                {draft.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">r/{draft.subreddit}</span>
                <span>•</span>
                <span>{formatDistanceToNow(draft.createdAt, { addSuffix: true })}</span>
                {draft.favorite && (
                  <>
                    <span>•</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Body Preview */}
          {draft.body && (
            <p className="text-xs text-muted-foreground mb-2 break-words">
              {showFullBody ? draft.body : bodyPreview}
              {hasMoreBody && !showFullBody && '...'}
              {hasMoreBody && (
                <button
                  onClick={() => setShowFullBody(!showFullBody)}
                  className="ml-1 text-primary hover:underline"
                >
                  {showFullBody ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>
          )}

          {/* Link for link posts */}
          {draft.postType === 'link' && draft.link && (
            <p className="text-xs text-blue-500 hover:underline mb-2 truncate">
              {draft.link}
            </p>
          )}

          {/* Poll info */}
          {draft.postType === 'poll' && draft.pollOptions && (
            <p className="text-xs text-muted-foreground mb-2">
              {draft.pollOptions.length} options • {draft.pollDuration} days
            </p>
          )}

          {/* Tags */}
          {draft.tags && draft.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {draft.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1">
            {draft.nsfw && (
              <Badge variant="destructive" className="text-xs">
                NSFW
              </Badge>
            )}
            {draft.spoiler && (
              <Badge variant="outline" className="text-xs">
                Spoiler
              </Badge>
            )}
            {draft.oc && (
              <Badge variant="outline" className="text-xs">
                OC
              </Badge>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(draft)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleFavorite?.(draft)}>
              <Star
                className={`mr-2 h-4 w-4 ${
                  draft.favorite ? 'fill-yellow-400 text-yellow-400' : ''
                }`}
              />
              {draft.favorite ? 'Unfavorite' : 'Favorite'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(draft)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.(draft)}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(draft)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
