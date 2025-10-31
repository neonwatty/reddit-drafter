import type { RedditDraft, MediaFile } from '@/lib/types'

/**
 * Create a mock draft with default values
 */
export function createMockDraft(overrides?: Partial<RedditDraft>): RedditDraft {
  const now = Date.now()
  return {
    id: `draft-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    title: 'Test Draft Title',
    body: 'This is a test draft body with some content.',
    subreddit: 'test',
    postType: 'text',
    nsfw: false,
    spoiler: false,
    oc: false,
    sendReplies: true,
    postToProfile: false,
    redditUsername: 'testuser',
    tags: [],
    notes: '',
    favorite: false,
    ...overrides,
  }
}

/**
 * Create multiple mock drafts
 */
export function createMockDrafts(count: number, baseOverrides?: Partial<RedditDraft>): RedditDraft[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDraft({
      ...baseOverrides,
      title: `Test Draft ${i + 1}`,
      createdAt: Date.now() - i * 1000 * 60, // Each draft 1 minute apart
    })
  )
}

/**
 * Create a mock link post draft
 */
export function createMockLinkDraft(overrides?: Partial<RedditDraft>): RedditDraft {
  return createMockDraft({
    postType: 'link',
    link: 'https://example.com',
    body: '',
    ...overrides,
  })
}

/**
 * Create a mock poll draft
 */
export function createMockPollDraft(overrides?: Partial<RedditDraft>): RedditDraft {
  return createMockDraft({
    postType: 'poll',
    body: '',
    pollOptions: [
      { text: 'Option 1', order: 0 },
      { text: 'Option 2', order: 1 },
      { text: 'Option 3', order: 2 },
    ],
    pollDuration: 3,
    ...overrides,
  })
}

/**
 * Create a mock image post draft
 */
export function createMockImageDraft(overrides?: Partial<RedditDraft>): RedditDraft {
  return createMockDraft({
    postType: 'image',
    body: '',
    imageIds: ['img-123'],
    ...overrides,
  })
}

/**
 * Create a mock draft with tags
 */
export function createMockDraftWithTags(tags: string[], overrides?: Partial<RedditDraft>): RedditDraft {
  return createMockDraft({
    tags,
    ...overrides,
  })
}

/**
 * Create a favorite draft
 */
export function createMockFavoriteDraft(overrides?: Partial<RedditDraft>): RedditDraft {
  return createMockDraft({
    favorite: true,
    ...overrides,
  })
}

/**
 * Create a mock draft with flair
 */
export function createMockDraftWithFlair(
  flair: { id: string; text: string; templateId?: string },
  overrides?: Partial<RedditDraft>
): RedditDraft {
  return createMockDraft({
    flair,
    ...overrides,
  })
}

/**
 * Create a mock media file
 */
export function createMockMediaFile(draftId: string, overrides?: Partial<MediaFile>): MediaFile {
  return {
    id: `media-${Math.random().toString(36).substr(2, 9)}`,
    draftId,
    name: 'test-image.jpg',
    type: 'image/jpeg',
    size: 1024 * 500, // 500KB
    dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...', // Truncated for brevity
    order: 0,
    uploadedAt: Date.now(),
    ...overrides,
  }
}

/**
 * Create a mock video file
 */
export function createMockVideoFile(draftId: string, overrides?: Partial<MediaFile>): MediaFile {
  return {
    id: `media-${Math.random().toString(36).substr(2, 9)}`,
    draftId,
    name: 'test-video.mp4',
    type: 'video/mp4',
    size: 1024 * 1024 * 5, // 5MB
    dataUrl: 'data:video/mp4;base64,AAAAIGZ0eXBpc29t...',
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    order: 0,
    uploadedAt: Date.now(),
    ...overrides,
  }
}

