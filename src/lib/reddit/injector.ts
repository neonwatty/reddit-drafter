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
 * Switch to the appropriate post type tab based on draft post type
 * This ensures the correct form fields are visible before population
 */
async function switchToPostTypeTab(
  postType: string,
  variant: 'old' | 'new' | 'sh'
): Promise<void> {
  console.log(`[switchToPostTypeTab] Switching to ${postType} tab for ${variant} Reddit`)

  try {
    let tabSelector: string | null = null

    // Map post type to tab selector based on variant
    if (variant === 'new') {
      const tabMap: Record<string, string> = {
        text: NEW_REDDIT_SELECTORS.tabPost,
        link: NEW_REDDIT_SELECTORS.tabLink,
        image: NEW_REDDIT_SELECTORS.tabImage,
        video: NEW_REDDIT_SELECTORS.tabVideo,
        poll: NEW_REDDIT_SELECTORS.tabPoll,
        gallery: NEW_REDDIT_SELECTORS.tabImage, // Gallery uses image tab
      }
      tabSelector = tabMap[postType] || null
    } else if (variant === 'old') {
      const tabMap: Record<string, string> = {
        text: OLD_REDDIT_SELECTORS.tabText,
        link: OLD_REDDIT_SELECTORS.tabLink,
      }
      tabSelector = tabMap[postType] || null
    } else if (variant === 'sh') {
      // SH Reddit may use similar structure to new Reddit
      // For now, skip tab switching for sh variant
      console.log('[switchToPostTypeTab] Tab switching not implemented for sh.reddit.com')
      return
    }

    if (!tabSelector) {
      console.log(`[switchToPostTypeTab] No tab selector found for ${postType} on ${variant}`)
      return
    }

    // Find and click the tab (search in Shadow DOM!)
    const matchingTabs = searchInShadowDOM(document, tabSelector)
    const tab = matchingTabs[0] as HTMLElement | undefined

    if (tab) {
      // Check if tab is already active
      const isActive = tab.getAttribute('aria-selected') === 'true' ||
                      tab.classList.contains('active') ||
                      tab.classList.contains('selected')

      if (!isActive) {
        console.log(`[switchToPostTypeTab] Clicking ${postType} tab...`)
        tab.click()

        // Wait for tab switch animation/transition AND form re-render to complete
        // Reddit re-renders the entire form when switching tabs, so we need to wait longer
        await new Promise(resolve => setTimeout(resolve, 500))

        const nowActive = tab.getAttribute('aria-selected') === 'true'
        console.log(`[switchToPostTypeTab] Tab switched successfully (active: ${nowActive})`)
      } else {
        console.log(`[switchToPostTypeTab] ${postType} tab already active`)
      }
    } else {
      console.warn(`[switchToPostTypeTab] Tab not found for ${postType} (selector: ${tabSelector})`)
    }
  } catch (error) {
    console.error('[switchToPostTypeTab] Error switching tabs:', error)
    // Don't throw - continue with form population even if tab switch fails
  }
}

/**
 * Populate old.reddit.com form
 */
async function populateOldRedditForm(
  draft: RedditDraft
): Promise<{ success: boolean; error?: string }> {
  const SEL = OLD_REDDIT_SELECTORS

  // Switch to appropriate tab FIRST (before populating form)
  await switchToPostTypeTab(draft.postType, 'old')

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
 * Helper function to search within Shadow DOM
 */
function searchInShadowDOM(root: Document | ShadowRoot, selector: string): Element[] {
  const results: Element[] = []

  // Search in current root
  results.push(...Array.from(root.querySelectorAll(selector)))

  // Search in all shadow roots
  const allElements = root.querySelectorAll('*')
  allElements.forEach(el => {
    if (el.shadowRoot) {
      results.push(...searchInShadowDOM(el.shadowRoot, selector))
    }
  })

  return results
}

/**
 * Populate new.reddit.com form
 */
async function populateNewRedditForm(
  draft: RedditDraft
): Promise<{ success: boolean; error?: string }> {
  const SEL = NEW_REDDIT_SELECTORS

  console.log('[populateNewRedditForm] Loading draft:', { title: draft.title, body: draft.body?.substring(0, 50) })

  // Switch to appropriate tab FIRST (before populating form)
  await switchToPostTypeTab(draft.postType, 'new')

  // Set title - search in Shadow DOM
  const titleElements = searchInShadowDOM(document, 'textarea[name="title"], input[name="title"]')
  const titleInput = titleElements.find(el => el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') as HTMLInputElement | HTMLTextAreaElement | undefined

  if (titleInput) {
    console.log('[populateNewRedditForm] Found title input:', titleInput.tagName)
    titleInput.value = draft.title
    titleInput.dispatchEvent(new Event('input', { bubbles: true }))
    titleInput.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    console.warn('[populateNewRedditForm] Title input not found')
  }

  // Set body text (Reddit allows body text on text, image, video, and gallery posts)
  if (draft.body && ['text', 'image', 'video', 'gallery'].includes(draft.postType)) {
    // Search for body textarea in Shadow DOM
    const bodyElements = searchInShadowDOM(document, 'textarea[placeholder*="Text"], textarea[name="text"]')
    const textInput = bodyElements.find(el => el.tagName === 'TEXTAREA') as HTMLTextAreaElement | undefined

    if (textInput) {
      console.log('[populateNewRedditForm] Found body textarea')
      textInput.value = draft.body
      textInput.dispatchEvent(new Event('input', { bubbles: true }))
      textInput.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      // Fallback: try contenteditable div
      const contentEditableElements = searchInShadowDOM(document, SEL.text)

      // Filter to find the actual editor div (usually has role="textbox" or specific class)
      const editorDivs = contentEditableElements.filter(el => {
        const hasContentEditable = el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'true'
        const hasTextboxRole = el.getAttribute('role') === 'textbox'
        const hasEditorClass = el.className?.includes('editor') || el.className?.includes('text')
        return hasContentEditable && (hasTextboxRole || hasEditorClass || el.tagName === 'DIV')
      }) as HTMLElement[]

      // Try the largest contenteditable div (likely the main editor)
      const ceDiv = editorDivs.sort((a, b) => {
        const aSize = a.offsetHeight * a.offsetWidth
        const bSize = b.offsetHeight * b.offsetWidth
        return bSize - aSize
      })[0]

      if (ceDiv) {
        console.log('[populateNewRedditForm] Found body contenteditable div, setting content...')

        // Focus the element first
        ceDiv.focus()

        // Get the native setter for textContent to bypass React
        const nativeTextContentSetter = Object.getOwnPropertyDescriptor(
          window.HTMLElement.prototype,
          'textContent'
        )?.set

        // Clear and set using native setter
        if (nativeTextContentSetter) {
          nativeTextContentSetter.call(ceDiv, draft.body)
        } else {
          ceDiv.textContent = draft.body
        }

        // Create a synthetic input event that React will recognize
        const inputEvent = new Event('input', { bubbles: true })
        const tracker = (ceDiv as any)._valueTracker
        if (tracker) {
          tracker.setValue('')
        }
        ceDiv.dispatchEvent(inputEvent)

        // Also try dispatching as InputEvent with data
        const inputEventWithData = new InputEvent('input', {
          bubbles: true,
          cancelable: false,
          data: draft.body,
          inputType: 'insertText'
        })
        ceDiv.dispatchEvent(inputEventWithData)

        console.log('[populateNewRedditForm] Body contenteditable set, textContent length:', ceDiv.textContent?.length || 0)
      } else {
        console.warn('[populateNewRedditForm] Body input not found - neither textarea nor contenteditable')
      }
    }
  } else if (draft.postType === 'link' && draft.link) {
    // Search for URL input in Shadow DOM
    const urlElements = searchInShadowDOM(document, 'input[name="url"], input[placeholder*="https://"]')
    const urlInput = urlElements.find(el => el.tagName === 'INPUT') as HTMLInputElement | undefined

    if (urlInput) {
      console.log('[populateNewRedditForm] Found URL input')
      urlInput.value = draft.link
      urlInput.dispatchEvent(new Event('input', { bubbles: true }))
      urlInput.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      console.warn('[populateNewRedditForm] URL input not found')
    }
  } else if (draft.postType === 'poll' && draft.pollOptions) {
    // Populate poll options - search in Shadow DOM
    const pollElements = searchInShadowDOM(document, 'input[name^="poll-option-"]')
    draft.pollOptions.forEach((option, index) => {
      if (pollElements[index]) {
        const input = pollElements[index] as HTMLInputElement
        input.value = option.text
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })

    // Set poll duration
    const durationElements = searchInShadowDOM(document, 'select[name="poll-duration"]')
    const durationSelect = durationElements[0] as HTMLSelectElement | undefined

    if (durationSelect && draft.pollDuration) {
      durationSelect.value = draft.pollDuration.toString()
      durationSelect.dispatchEvent(new Event('change', { bubbles: true }))
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

  // TODO: Flair injection - needs proper selector research for current Reddit layout

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

  // Switch to appropriate tab FIRST (before populating form)
  await switchToPostTypeTab(draft.postType, 'sh')

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

/**
 * Wait for Reddit form to be ready for injection
 * Polls for form elements with exponential backoff
 * @param maxWait Maximum time to wait in milliseconds (default 5000)
 * @returns Promise that resolves to true when form is ready, false on timeout
 */
export async function waitForFormReady(maxWait = 5000): Promise<boolean> {
  const variant = detectRedditVariant()
  const startTime = Date.now()
  let attempt = 0

  console.log('[waitForFormReady] Waiting for form to be ready, variant:', variant)

  while (Date.now() - startTime < maxWait) {
    let formReady = false

    try {
      switch (variant) {
        case 'old': {
          // Check for title input in old Reddit
          const titleInput = document.querySelector(OLD_REDDIT_SELECTORS.title)
          formReady = !!titleInput
          break
        }
        case 'new': {
          // Check for title input in new Reddit (search shadow DOM)
          const titleElements = searchInShadowDOM(document, 'textarea[name="title"], input[name="title"]')
          formReady = titleElements.length > 0
          break
        }
        case 'sh': {
          // Check for title input in sh Reddit
          const titleInput = document.querySelector(SH_REDDIT_SELECTORS.title)
          formReady = !!titleInput
          break
        }
        default:
          console.warn('[waitForFormReady] Unknown variant, assuming not ready')
          formReady = false
      }
    } catch (error) {
      console.warn('[waitForFormReady] Error checking form:', error)
      formReady = false
    }

    if (formReady) {
      console.log('[waitForFormReady] Form ready after', Date.now() - startTime, 'ms')
      return true
    }

    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, then 400ms intervals
    const waitTime = Math.min(50 * Math.pow(2, attempt), 400)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    attempt++
  }

  console.warn('[waitForFormReady] Timeout after', maxWait, 'ms')
  return false
}
