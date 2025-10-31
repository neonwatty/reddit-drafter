// Reddit Draft Data Model

export interface RedditDraft {
  // Identity
  id: string                     // UUID v4
  createdAt: number              // Unix timestamp
  updatedAt: number              // Unix timestamp

  // Post Content
  title: string
  body: string                   // Markdown text for text posts
  subreddit: string              // e.g., "AskReddit"

  // Post Type
  postType: 'text' | 'link' | 'image' | 'video' | 'poll' | 'gallery'

  // Type-Specific Data
  link?: string                  // URL for link posts
  imageIds?: string[]            // References to MediaFile IDs
  videoId?: string               // Reference to MediaFile ID
  pollOptions?: PollOption[]     // For poll posts
  pollDuration?: number          // Poll duration in days (1-7) - REQUIRED for polls

  // Reddit Metadata
  flair?: {
    id: string
    text: string
    templateId?: string
  }
  nsfw: boolean
  spoiler: boolean
  oc: boolean                    // Original content flag
  sendReplies: boolean           // Send reply notifications
  postToProfile: boolean         // Post to user profile vs subreddit
  suggestedSort?: 'best' | 'new' | 'controversial' | 'old' | 'qa'  // Comment sorting

  // Account Context
  redditUsername: string         // Which Reddit account owns this draft

  // Organization
  tags: string[]                 // User-defined tags
  notes: string                  // Personal notes
  favorite: boolean              // Pin important drafts

  // State
  lastEditedField?: string       // For recovery
  crosspostParent?: string       // Parent post ID if crossposting
}

export interface MediaFile {
  id: string                     // UUID v4
  draftId: string                // Parent draft reference
  name: string                   // Original filename
  type: string                   // MIME type (image/jpeg, video/mp4, etc.)
  size: number                   // Bytes
  dataUrl: string                // base64 encoded data URL
  thumbnail?: string             // base64 thumbnail for videos/large images
  captionText?: string           // Caption for images in gallery
  captionUrl?: string            // Link in caption
  order: number                  // For gallery ordering
  uploadedAt: number             // Timestamp
}

export interface PollOption {
  text: string      // Max 255 characters
  order: number     // 0-indexed position (0-5, since Reddit allows 2-6 options)
}

// Poll Validation Rules
interface PollValidationRules {
  minOptions: 2
  maxOptions: 6
  minDuration: 1    // days
  maxDuration: 7    // days
  maxOptionLength: 255  // characters
}

export const POLL_RULES: PollValidationRules = {
  minOptions: 2,
  maxOptions: 6,
  minDuration: 1,
  maxDuration: 7,
  maxOptionLength: 255
}

export interface DraftFilters {
  subreddit?: string
  postType?: string
  tags?: string[]
  favorite?: boolean
  searchQuery?: string
  dateRange?: {
    start: number
    end: number
  }
}

// Reddit Variant Type
export type RedditVariant = 'old' | 'new' | 'sh' | 'unknown'

// Parsed Form Data (for extracting data from Reddit forms)
export interface ParsedFormData {
  draft: Partial<RedditDraft>
  extractedMedia?: File[]  // Images/videos extracted from the Reddit form
}
