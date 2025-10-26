import type { RedditDraft } from '@/lib/types'
import { SH_REDDIT_SELECTORS as SEL } from '../selectors/sh-selectors'
import { detectRedditUsername } from '../variant-detector'

/**
 * Parse Reddit form data from sh.reddit.com
 *
 * NOTE: sh.reddit.com is new and experimental. These selectors
 * are PLACEHOLDERS and need to be updated based on actual DOM structure.
 *
 * TODO: Update selectors once sh.reddit.com is widely available
 */
export function parseSHRedditForm(): Partial<RedditDraft> {
  console.warn('[parseSHRedditForm] sh.reddit.com support is experimental. Selectors may need updating.')

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

  // Attempt to get title (placeholder selector)
  try {
    const titleInput = document.querySelector(SEL.title) as HTMLInputElement | HTMLTextAreaElement
    if (titleInput) {
      draft.title = titleInput.value?.trim() || ''
    }
  } catch (error) {
    console.error('[parseSHRedditForm] Error parsing title:', error)
  }

  // Attempt to get text content (placeholder selector)
  try {
    const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement | HTMLDivElement
    if (textInput) {
      if (textInput.tagName === 'TEXTAREA') {
        draft.body = (textInput as HTMLTextAreaElement).value.trim()
      } else {
        draft.body = textInput.textContent?.trim() || ''
      }
    }
  } catch (error) {
    console.error('[parseSHRedditForm] Error parsing text:', error)
  }

  // Attempt to get URL (placeholder selector)
  try {
    const urlInput = document.querySelector(SEL.url) as HTMLInputElement
    if (urlInput) {
      draft.link = urlInput.value.trim()
    }
  } catch (error) {
    console.error('[parseSHRedditForm] Error parsing URL:', error)
  }

  // Attempt to get subreddit (placeholder selector)
  try {
    const subredditInput = document.querySelector(SEL.subreddit) as HTMLInputElement
    if (subredditInput) {
      draft.subreddit = subredditInput.value.trim().replace(/^r\//, '')
    }
  } catch (error) {
    console.error('[parseSHRedditForm] Error parsing subreddit:', error)
  }

  // Return partial draft with warning
  console.warn('[parseSHRedditForm] Returning potentially incomplete data. Please test on actual sh.reddit.com and update selectors.')

  return draft
}

/**
 * Check if sh.reddit form has any content
 *
 * NOTE: This is a placeholder implementation
 */
export function checkSHRedditFormHasContent(): boolean {
  console.warn('[checkSHRedditFormHasContent] Using placeholder implementation for sh.reddit.com')

  try {
    const titleInput = document.querySelector(SEL.title) as HTMLInputElement | HTMLTextAreaElement
    const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement | HTMLDivElement
    const urlInput = document.querySelector(SEL.url) as HTMLInputElement

    // Check text input based on element type
    let textContent = ''
    if (textInput) {
      if (textInput.tagName === 'TEXTAREA') {
        textContent = (textInput as HTMLTextAreaElement).value.trim()
      } else {
        textContent = textInput.textContent?.trim() || ''
      }
    }

    return !!(
      titleInput?.value?.trim() ||
      textContent ||
      urlInput?.value?.trim()
    )
  } catch (error) {
    console.error('[checkSHRedditFormHasContent] Error:', error)
    return false
  }
}
