import type { RedditDraft } from '@/lib/types'
import { OLD_REDDIT_SELECTORS as SEL } from '../selectors/old-selectors'
import { detectRedditUsername } from '../variant-detector'

/**
 * Parse Reddit form data from old.reddit.com
 */
export function parseOldRedditForm(): Partial<RedditDraft> {
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
  const titleInput = document.querySelector(SEL.title) as HTMLTextAreaElement
  if (titleInput) {
    draft.title = titleInput.value.trim()
  }

  // Detect post type from active tab
  const isLinkTab = document.querySelector(SEL.tabLink)?.classList.contains('selected')
  draft.postType = isLinkTab ? 'link' : 'text'

  // Get content based on post type
  if (draft.postType === 'text') {
    const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement
    if (textInput) {
      draft.body = textInput.value.trim()
    }
  } else if (draft.postType === 'link') {
    const urlInput = document.querySelector(SEL.url) as HTMLInputElement
    if (urlInput) {
      draft.link = urlInput.value.trim()
    }
  }

  // Get subreddit
  const subredditInput = document.querySelector(SEL.subreddit) as HTMLInputElement
  if (subredditInput) {
    draft.subreddit = subredditInput.value.trim().replace(/^r\//, '')
  }

  // Get metadata checkboxes
  const nsfwCheckbox = document.querySelector(SEL.nsfw) as HTMLInputElement
  if (nsfwCheckbox) {
    draft.nsfw = nsfwCheckbox.checked
  }

  const spoilerCheckbox = document.querySelector(SEL.spoiler) as HTMLInputElement
  if (spoilerCheckbox) {
    draft.spoiler = spoilerCheckbox.checked
  }

  const sendrepliesCheckbox = document.querySelector(SEL.sendreplies) as HTMLInputElement
  if (sendrepliesCheckbox) {
    draft.sendReplies = sendrepliesCheckbox.checked
  }

  // Get flair if selected
  const flairLabel = document.querySelector(SEL.flairSelector)
  if (flairLabel && flairLabel.textContent) {
    draft.flair = {
      id: '',
      text: flairLabel.textContent.trim(),
      templateId: undefined
    }
  }

  return draft
}

/**
 * Check if old Reddit form has any content
 */
export function checkOldRedditFormHasContent(): boolean {
  const titleInput = document.querySelector(SEL.title) as HTMLTextAreaElement
  const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement
  const urlInput = document.querySelector(SEL.url) as HTMLInputElement

  return !!(
    titleInput?.value?.trim() ||
    textInput?.value?.trim() ||
    urlInput?.value?.trim()
  )
}
