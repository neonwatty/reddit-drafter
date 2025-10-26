import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  postTypeFilter: string
  onPostTypeFilterChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
}

export default function SearchBar({
  value,
  onChange,
  postTypeFilter,
  onPostTypeFilterChange,
  sortBy,
  onSortByChange,
}: SearchBarProps) {
  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search drafts..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={postTypeFilter} onValueChange={onPostTypeFilterChange}>
            <SelectTrigger className="h-9">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3" />
                <SelectValue placeholder="All types" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="poll">Poll</SelectItem>
              <SelectItem value="gallery">Gallery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="title">Title (A-Z)</SelectItem>
              <SelectItem value="subreddit">Subreddit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
