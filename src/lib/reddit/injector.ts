import type { RedditDraft } from '../types'
import { detectRedditVariant } from './variant-detector'
import { OLD_REDDIT_SELECTORS } from './selectors/old-selectors'
import { NEW_REDDIT_SELECTORS } from './selectors/new-selectors'
import { SH_REDDIT_SELECTORS } from './selectors/sh-selectors'
import {
  checkOldRedditFormHasContent,
} from './parsers/parse-old'
import {
  checkNewRedditFormHasContent,
} from './parsers/parse-new'
import {
  checkSHRedditFormHasContent,
} from './parsers/parse-sh'
import { getMediaForDraft } from '../storage/media'

/**
 * Load a draft into the Reddit form
 * Warns user before overwriting existing content
 */
export async function loadDraftIntoForm(
  draft: RedditDraft,
  skipWarning = false
): Promise<{ success: boolean; error?: string; hasMedia?: boolean; mediaCount?: number }> {
  const variant = detectRedditVariant()

  // Check for attached media
  const media = await getMediaForDraft(draft.id)
  const hasMedia = media.length > 0

  // Check if form has content and warn user
  if (!skipWarning) {
    const hasContent = checkFormHasContent(variant)

    if (hasContent) {
      const confirmed = confirm(
        'The form already has content. Loading this draft will replace it. Continue?'
      )
      if (!confirmed) {
        return { success: false, error: 'User cancelled' }
      }
    }
  }

  // Load draft based on variant
  try {
    let result: { success: boolean; error?: string }

    switch (variant) {
      case 'old':
        result = await populateOldRedditForm(draft)
        break
      case 'new':
        result = await populateNewRedditForm(draft)
        break
      case 'sh':
        result = await populateSHRedditForm(draft)
        break
      default:
        return { success: false, error: 'Unsupported Reddit variant' }
    }

    // Include media info in response
    return {
      ...result,
      hasMedia,
      mediaCount: media.length
    }
  } catch (error) {
    console.error('[loadDraftIntoForm] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if form has content based on variant
 */
function checkFormHasContent(variant: string): boolean {
  switch (variant) {
    case 'old':
      return checkOldRedditFormHasContent()
    case 'new':
      return checkNewRedditFormHasContent()
    case 'sh':
      return checkSHRedditFormHasContent()
    default:
      return false
  }
}

/**
 * Populate old.reddit.com form
 */
async function populateOldRedditForm(
  draft: RedditDraft
): Promise<{ success: boolean; error?: string }> {
  const SEL = OLD_REDDIT_SELECTORS

  // Set title
  const titleInput = document.querySelector(SEL.title) as HTMLTextAreaElement
  if (titleInput) {
    titleInput.value = draft.title
    titleInput.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // Set content based on post type
  if (draft.postType === 'text' && draft.body) {
    const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement
    if (textInput) {
      textInput.value = draft.body
      textInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
  } else if (draft.postType === 'link' && draft.link) {
    const urlInput = document.querySelector(SEL.url) as HTMLInputElement
    if (urlInput) {
      urlInput.value = draft.link
      urlInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  // Set metadata
  const nsfwCheckbox = document.querySelector(SEL.nsfw) as HTMLInputElement
  if (nsfwCheckbox) {
    nsfwCheckbox.checked = draft.nsfw
    nsfwCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const spoilerCheckbox = document.querySelector(SEL.spoiler) as HTMLInputElement
  if (spoilerCheckbox) {
    spoilerCheckbox.checked = draft.spoiler
    spoilerCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const sendrepliesCheckbox = document.querySelector(SEL.sendreplies) as HTMLInputElement
  if (sendrepliesCheckbox) {
    sendrepliesCheckbox.checked = draft.sendReplies
    sendrepliesCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
  }

  return { success: true }
}

/**
 * Populate new.reddit.com form
 */
async function populateNewRedditForm(
  draft: RedditDraft
): Promise<{ success: boolean; error?: string }> {
  const SEL = NEW_REDDIT_SELECTORS

  // Set title
  const titleInput = document.querySelector(SEL.title) as HTMLInputElement | HTMLTextAreaElement
  if (titleInput) {
    titleInput.value = draft.title
    titleInput.dispatchEvent(new Event('input', { bubbles: true }))
    titleInput.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // Set content based on post type
  if (draft.postType === 'text' && draft.body) {
    const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement | HTMLDivElement
    if (textInput) {
      if (textInput.tagName === 'TEXTAREA') {
        (textInput as HTMLTextAreaElement).value = draft.body
        textInput.dispatchEvent(new Event('input', { bubbles: true }))
      } else {
        // Contenteditable div
        textInput.textContent = draft.body
        textInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  } else if (draft.postType === 'link' && draft.link) {
    const urlInput = document.querySelector(SEL.url) as HTMLInputElement
    if (urlInput) {
      urlInput.value = draft.link
      urlInput.dispatchEvent(new Event('input', { bubbles: true }))
      urlInput.dispatchEvent(new Event('change', { bubbles: true }))
    }
  } else if (draft.postType === 'poll' && draft.pollOptions) {
    // Populate poll options
    const pollInputs = document.querySelectorAll(SEL.pollOptionInputs)
    draft.pollOptions.forEach((option, index) => {
      if (pollInputs[index]) {
        const input = pollInputs[index] as HTMLInputElement
        input.value = option.text
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })

    // Set poll duration
    if (draft.pollDuration) {
      const durationSelect = document.querySelector(SEL.pollDurationSelect) as HTMLSelectElement
      if (durationSelect) {
        durationSelect.value = draft.pollDuration.toString()
        durationSelect.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  // Set metadata toggles - need to click buttons instead of setting checkboxes
  if (draft.nsfw) {
    toggleNewRedditButton(SEL.nsfw, true)
  }

  if (draft.spoiler) {
    toggleNewRedditButton(SEL.spoiler, true)
  }

  if (draft.oc) {
    toggleNewRedditButton(SEL.oc, true)
  }

  return { success: true }
}

/**
 * Toggle a button in new Reddit (for NSFW, Spoiler, OC)
 */
function toggleNewRedditButton(selector: string, active: boolean): void {
  const button = document.querySelector(selector) as HTMLElement
  if (!button) return

  const isCurrentlyActive = button.getAttribute('aria-pressed') === 'true' ||
    button.classList.contains('active')

  // Only click if we need to change the state
  if (isCurrentlyActive !== active) {
    button.click()
  }
}

/**
 * Populate sh.reddit.com form
 * NOTE: This is experimental and may not work correctly
 */
async function populateSHRedditForm(
  draft: RedditDraft
): Promise<{ success: boolean; error?: string }> {
  console.warn('[populateSHRedditForm] sh.reddit.com support is experimental')

  const SEL = SH_REDDIT_SELECTORS

  try {
    // Attempt to set title (placeholder)
    const titleInput = document.querySelector(SEL.title) as HTMLInputElement | HTMLTextAreaElement
    if (titleInput) {
      titleInput.value = draft.title
      titleInput.dispatchEvent(new Event('input', { bubbles: true }))
    }

    // Attempt to set text content (placeholder)
    if (draft.postType === 'text' && draft.body) {
      const textInput = document.querySelector(SEL.text) as HTMLTextAreaElement | HTMLDivElement
      if (textInput) {
        if (textInput.tagName === 'TEXTAREA') {
          (textInput as HTMLTextAreaElement).value = draft.body
        } else {
          textInput.textContent = draft.body
        }
        textInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[populateSHRedditForm] Error:', error)
    return {
      success: false,
      error: 'Failed to populate sh.reddit.com form. Selectors may need updating.'
    }
  }
}
