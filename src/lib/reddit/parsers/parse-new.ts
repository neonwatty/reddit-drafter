import type { RedditDraft, PollOption } from '@/lib/types'
import { NEW_REDDIT_SELECTORS as SEL } from '../selectors/new-selectors'
import { detectRedditUsername } from '../variant-detector'

/**
 * Parse Reddit form data from new.reddit.com (www.reddit.com)
 */
export function parseNewRedditForm(): Partial<RedditDraft> {
  const draft: Partial<RedditDraft> = {
    title: '',
    body: '',
    subreddit: '',
    postType: 'text',
    nsfw: false,
    spoiler: false,
    oc: false,
    sendReplies: true,
    postToProfile: false,
    redditUsername: detectRedditUsername(),
    tags: [],
    notes: '',
    favorite: false
  }

  // Get title
  const titleInput = document.querySelector(SEL.title) as HTMLInputElement | HTMLTextAreaElement
  if (titleInput) {
    draft.title = titleInput.value?.trim() || ''
  }

  // Detect post type from active tab
  draft.postType = detectNewRedditPostType()

  // Get content based on post type
  switch (draft.postType) {
    case 'text': {
      const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement | HTMLDivElement
      if (textInput) {
        if (textInput.tagName === 'TEXTAREA') {
          draft.body = (textInput as HTMLTextAreaElement).value.trim()
        } else {
          // Contenteditable div
          draft.body = textInput.textContent?.trim() || ''
        }
      }
      break
    }

    case 'link': {
      const urlInput = document.querySelector(SEL.url) as HTMLInputElement
      if (urlInput) {
        draft.link = urlInput.value.trim()
      }
      break
    }

    case 'poll': {
      // Parse poll options
      const pollOptions = parsePollOptions()
      if (pollOptions.length > 0) {
        draft.pollOptions = pollOptions
      }

      // Parse poll duration
      const durationSelect = document.querySelector(SEL.pollDurationSelect) as HTMLSelectElement
      if (durationSelect) {
        draft.pollDuration = parseInt(durationSelect.value) || 3 // Default 3 days
      }
      break
    }

    case 'image':
    case 'video':
    case 'gallery':
      // Media handling will be done in Phase 5
      // For now, just mark the type
      break
  }

  // Get subreddit
  const subredditButton = document.querySelector(SEL.subreddit) as HTMLElement
  if (subredditButton) {
    const subredditText = subredditButton.textContent?.trim().replace(/^r\//, '') || ''
    draft.subreddit = subredditText
  }

  // Get metadata toggles
  draft.nsfw = isToggleActive(SEL.nsfw)
  draft.spoiler = isToggleActive(SEL.spoiler)
  draft.oc = isToggleActive(SEL.oc)

  const sendrepliesCheckbox = document.querySelector(SEL.sendreplies) as HTMLInputElement
  if (sendrepliesCheckbox) {
    draft.sendReplies = sendrepliesCheckbox.checked
  }

  // Get flair if selected
  const flairElement = document.querySelector(SEL.flairSelector)
  if (flairElement) {
    draft.flair = {
      id: flairElement.getAttribute('data-flair-id') || '',
      text: flairElement.textContent?.trim() || '',
      templateId: flairElement.getAttribute('data-flair-template-id') || undefined
    }
  }

  return draft
}

/**
 * Detect post type from active tab in new Reddit
 */
function detectNewRedditPostType(): RedditDraft['postType'] {
  const activeTab = document.querySelector(SEL.activeTab)
  if (!activeTab) return 'text'

  const tabText = activeTab.textContent?.toLowerCase() || ''
  const tabName = activeTab.getAttribute('name')?.toLowerCase() || ''

  if (tabText.includes('image') || tabName === 'image') return 'image'
  if (tabText.includes('video') || tabName === 'video') return 'video'
  if (tabText.includes('link') || tabName === 'link') return 'link'
  if (tabText.includes('poll') || tabName === 'poll') return 'poll'
  if (tabText.includes('gallery')) return 'gallery'

  return 'text'
}

/**
 * Parse poll options from new Reddit form
 */
function parsePollOptions(): PollOption[] {
  const pollInputs = document.querySelectorAll(SEL.pollOptionInputs)
  const options: PollOption[] = []

  pollInputs.forEach((input, index) => {
    const value = (input as HTMLInputElement).value.trim()
    if (value) {
      options.push({
        text: value,
        order: index
      })
    }
  })

  return options
}

/**
 * Check if a toggle button is active (for NSFW, Spoiler, OC)
 */
function isToggleActive(selector: string): boolean {
  const element = document.querySelector(selector) as HTMLElement
  if (!element) return false

  // Check if it's a checkbox
  if (element.tagName === 'INPUT') {
    return (element as HTMLInputElement).checked
  }

  // Check if it's a button with aria-pressed or active class
  const ariaPressed = element.getAttribute('aria-pressed')
  if (ariaPressed) {
    return ariaPressed === 'true'
  }

  return element.classList.contains('active') || element.classList.contains('selected')
}

/**
 * Check if new Reddit form has any content
 */
export function checkNewRedditFormHasContent(): boolean {
  const titleInput = document.querySelector(SEL.title) as HTMLInputElement | HTMLTextAreaElement
  const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement | HTMLDivElement
  const urlInput = document.querySelector(SEL.url) as HTMLInputElement

  let hasTitle = false
  let hasText = false
  let hasUrl = false

  if (titleInput) {
    hasTitle = !!(titleInput.value?.trim())
  }

  if (textInput) {
    if (textInput.tagName === 'TEXTAREA') {
      hasText = !!((textInput as HTMLTextAreaElement).value?.trim())
    } else {
      hasText = !!(textInput.textContent?.trim())
    }
  }

  if (urlInput) {
    hasUrl = !!(urlInput.value?.trim())
  }

  return hasTitle || hasText || hasUrl
}
