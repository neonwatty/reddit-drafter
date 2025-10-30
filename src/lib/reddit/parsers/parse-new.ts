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

  // Get title - Search for actual user input
  console.log('[parseNewRedditForm] === SEARCHING FOR USER INPUT ===')

  // Helper function to search within Shadow DOM
  function searchInShadowDOM(root: Document | ShadowRoot, selector: string): Element[] {
    const results: Element[] = []

    // Search in current root
    results.push(...Array.from(root.querySelectorAll(selector)))

    // Search in all shadow roots
    const allElements = root.querySelectorAll('*')
    allElements.forEach(el => {
      if (el.shadowRoot) {
        console.log('[parseNewRedditForm] Found Shadow DOM in:', el.tagName)
        results.push(...searchInShadowDOM(el.shadowRoot, selector))
      }
    })

    return results
  }

  // Search for ALL input and textarea elements (including Shadow DOM)
  const allInputs = searchInShadowDOM(document, 'input[type="text"], textarea, div[contenteditable="true"]')
  console.log('[parseNewRedditForm] Found', allInputs.length, 'input/textarea/contenteditable elements (including Shadow DOM)')

  allInputs.forEach((el, i) => {
    const element = el as HTMLInputElement | HTMLTextAreaElement | HTMLElement
    let value = ''

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      value = (element as HTMLInputElement | HTMLTextAreaElement).value
    } else {
      value = element.textContent || ''
    }

    if (value.trim()) {
      console.log(`[parseNewRedditForm] Input ${i} WITH VALUE:`, {
        tag: element.tagName,
        value: value.substring(0, 100),
        id: element.id,
        name: (element as any).name,
        placeholder: (element as any).placeholder,
        ariaLabel: element.getAttribute('aria-label'),
        classList: Array.from(element.classList).slice(0, 3).join(' '),
        inShadowDOM: element.getRootNode() !== document
      })
    }
  })

  // Also search for web components (shreddit-* elements)
  const webComponents = document.querySelectorAll('shreddit-post, shreddit-composer, [class*="title"], [class*="post"]')
  console.log('[parseNewRedditForm] Found', webComponents.length, 'web components or elements with title/post in class name')

  Array.from(webComponents).slice(0, 10).forEach((el, i) => {
    const element = el as HTMLElement
    console.log(`[parseNewRedditForm] Component ${i}:`, {
      tag: element.tagName,
      hasShadowRoot: !!element.shadowRoot,
      classList: Array.from(element.classList).slice(0, 3).join(' '),
      textContent: element.textContent?.substring(0, 50),
      innerHTML: element.innerHTML.substring(0, 100)
    })
  })

  // Try to find title - prioritize form inputs over contenteditable divs
  let titleElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | undefined

  // Priority 1: Try textarea with name="title" (most specific)
  const titleTextareas = searchInShadowDOM(document, 'textarea[name="title"]')
  if (titleTextareas.length > 0) {
    titleElement = titleTextareas[0] as HTMLTextAreaElement
    console.log('[parseNewRedditForm] Title element found: TEXTAREA with name="title"')
  }

  // Priority 2: Try input with name="title"
  if (!titleElement) {
    const titleInputs = searchInShadowDOM(document, 'input[name="title"]')
    if (titleInputs.length > 0) {
      titleElement = titleInputs[0] as HTMLInputElement
      console.log('[parseNewRedditForm] Title element found: INPUT with name="title"')
    }
  }

  // Priority 3: Try other specific selectors
  if (!titleElement) {
    const titleElements = searchInShadowDOM(document, SEL.title)
    // Filter to prefer INPUT/TEXTAREA over DIV
    const formElements = titleElements.filter(el => el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
    titleElement = (formElements.length > 0 ? formElements[0] : titleElements[0]) as HTMLInputElement | HTMLTextAreaElement | HTMLElement | undefined
    console.log('[parseNewRedditForm] Title element found (fallback):', !!titleElement, titleElement?.tagName)
  }

  if (titleElement) {
    // Check if it's a contenteditable div or input/textarea
    if (titleElement.tagName === 'TEXTAREA' || titleElement.tagName === 'INPUT') {
      draft.title = (titleElement as HTMLInputElement | HTMLTextAreaElement).value?.trim() || ''
      console.log('[parseNewRedditForm] Title from input/textarea:', draft.title)
    } else if (titleElement.hasAttribute('contenteditable')) {
      draft.title = titleElement.textContent?.trim() || ''
      console.log('[parseNewRedditForm] Title from contenteditable:', draft.title)

      // Debug: check the structure
      if (!draft.title) {
        console.log('[parseNewRedditForm] Title element details:', {
          innerHTML: titleElement.innerHTML.substring(0, 200),
          childElementCount: titleElement.childElementCount,
          children: Array.from(titleElement.children).map(c => ({
            tag: c.tagName,
            textContent: c.textContent?.substring(0, 50)
          })),
          inShadowDOM: titleElement.getRootNode() !== document
        })
      }
    }
  } else {
    console.warn('[parseNewRedditForm] No title element found')
  }

  // Detect post type from active tab
  draft.postType = detectNewRedditPostType()

  // Get content based on post type
  switch (draft.postType) {
    case 'text': {
      // Priority 1: Try textarea for body
      let textElement: HTMLTextAreaElement | HTMLElement | undefined
      const bodyTextareas = searchInShadowDOM(document, 'textarea[placeholder*="Text"], textarea[name="text"]')
      console.log('[parseNewRedditForm] Found', bodyTextareas.length, 'body textareas in Shadow DOM')

      // Log all found textareas with their values
      bodyTextareas.forEach((el, i) => {
        const ta = el as HTMLTextAreaElement
        console.log(`[parseNewRedditForm] Textarea ${i}:`, {
          placeholder: ta.placeholder,
          name: ta.name,
          value: ta.value?.substring(0, 50),
          valueLength: ta.value?.length || 0
        })
      })

      // Find the textarea that has actual content
      const textareaWithContent = bodyTextareas.find(el => {
        const ta = el as HTMLTextAreaElement
        return ta.value && ta.value.trim().length > 0
      })

      if (textareaWithContent) {
        textElement = textareaWithContent as HTMLTextAreaElement
        console.log('[parseNewRedditForm] Body element found: TEXTAREA with content')
      } else if (bodyTextareas.length > 0) {
        // Use first textarea even if empty (user might want to save empty body)
        textElement = bodyTextareas[0] as HTMLTextAreaElement
        console.log('[parseNewRedditForm] Body element found: TEXTAREA (empty)')
      }

      // Priority 2: Try contenteditable divs if no textarea found
      if (!textElement) {
        const textElements = searchInShadowDOM(document, SEL.text)
        console.log('[parseNewRedditForm] Found', textElements.length, 'potential body elements')

        // Log all found elements
        textElements.forEach((el, i) => {
          const div = el as HTMLElement
          console.log(`[parseNewRedditForm] Body candidate ${i}:`, {
            tag: div.tagName,
            textContent: div.textContent?.substring(0, 50),
            textLength: div.textContent?.length || 0,
            hasContenteditable: div.hasAttribute('contenteditable')
          })
        })

        // Filter to prefer TEXTAREA over DIV
        const formElements = textElements.filter(el => el.tagName === 'TEXTAREA')
        if (formElements.length > 0) {
          textElement = formElements[0] as HTMLTextAreaElement
          console.log('[parseNewRedditForm] Using TEXTAREA')
        } else {
          // Use contenteditable div, prefer one with actual content
          const contentEditableDivs = textElements.filter(el =>
            el.tagName === 'DIV' &&
            el.hasAttribute('contenteditable')
          )

          // Prefer div with content over empty div
          const divWithContent = contentEditableDivs.find(el => {
            const text = el.textContent?.trim() || ''
            return text.length > 0 && text !== '\n'
          })

          textElement = (divWithContent || contentEditableDivs[0]) as HTMLElement
          console.log('[parseNewRedditForm] Using contenteditable DIV, hasContent:', !!divWithContent)
        }
        console.log('[parseNewRedditForm] Body element found (fallback):', !!textElement, textElement?.tagName)
      }

      if (textElement) {
        if (textElement.tagName === 'TEXTAREA') {
          draft.body = (textElement as HTMLTextAreaElement).value.trim()
          console.log('[parseNewRedditForm] Body from textarea:', draft.body?.substring(0, 50))
        } else if (textElement.hasAttribute('contenteditable')) {
          // Contenteditable div
          draft.body = textElement.textContent?.trim() || ''
          console.log('[parseNewRedditForm] Body from contenteditable:', draft.body?.substring(0, 50))

          // Debug: check the structure if empty
          if (!draft.body) {
            console.log('[parseNewRedditForm] Body element details:', {
              innerHTML: textElement.innerHTML.substring(0, 200),
              childElementCount: textElement.childElementCount,
              children: Array.from(textElement.children).map(c => ({
                tag: c.tagName,
                textContent: c.textContent?.substring(0, 50)
              })),
              inShadowDOM: textElement.getRootNode() !== document
            })
          }
        } else {
          // Other element types
          draft.body = textElement.textContent?.trim() || ''
          console.log('[parseNewRedditForm] Body from other element:', draft.body?.substring(0, 50))
        }
      } else {
        console.warn('[parseNewRedditForm] No body text element found')
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
  console.log('[parseNewRedditForm] Subreddit element found:', !!subredditButton)
  if (subredditButton) {
    const subredditText = subredditButton.textContent?.trim().replace(/^r\//, '') || ''
    draft.subreddit = subredditText
    console.log('[parseNewRedditForm] Subreddit from element:', draft.subreddit)
  }

  // Fallback: derive subreddit from URL when UI element is missing (Shreddit, new layouts)
  if (!draft.subreddit) {
    const match = window.location.pathname.match(/\/r\/([^/]+)\/submit/i)
    if (match?.[1]) {
      draft.subreddit = match[1]
      console.log('[parseNewRedditForm] Subreddit from URL:', draft.subreddit)
    } else {
      console.warn('[parseNewRedditForm] No subreddit found in URL:', window.location.pathname)
    }
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
