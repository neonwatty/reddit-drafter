import { createShadowDOMSidebar, mountReactApp } from '@/lib/shadow-dom/create-sidebar'
import RedditSidebarApp from './sidebar/RedditSidebarApp'
import ReactDOM from 'react-dom/client'
import { Toaster, toast } from 'sonner'
import { waitForFormReady, loadDraftIntoForm } from '@/lib/reddit/injector'
import { getDraft, createDraft } from '@/lib/storage/drafts'
import { initStorage } from '@/lib/storage/db'
import { parseOldRedditForm } from '@/lib/reddit/parsers/parse-old'
import { parseNewRedditForm } from '@/lib/reddit/parsers/parse-new'
import { parseSHRedditForm } from '@/lib/reddit/parsers/parse-sh'
import { validateDraft } from '@/lib/utils/validation'
import type { RedditDraft } from '@/lib/types'
// Import CSS as string using Vite's ?inline modifier
import styles from '@/globals.css?inline'

// Detect Reddit variant for logging
function detectRedditVariant(): string {
  const hostname = window.location.hostname

  if (hostname === 'old.reddit.com') return 'old'
  if (hostname === 'sh.reddit.com') return 'sh'
  if (hostname.includes('reddit.com')) return 'new'

  return 'unknown'
}

// Check for pending draft load from popup
async function checkPendingDraftLoad() {
  try {
    const { pendingDraftLoad } = await chrome.storage.local.get('pendingDraftLoad')

    if (pendingDraftLoad) {
      console.log('[Reddit Drafter] Pending draft load detected:', pendingDraftLoad)

      // Initialize storage first
      await initStorage()
      console.log('[Reddit Drafter] Storage initialized')

      // Wait for form to be ready with longer timeout and additional delay
      console.log('[Reddit Drafter] Waiting for form to be ready...')
      const formReady = await waitForFormReady(10000)

      if (!formReady) {
        console.error('[Reddit Drafter] Form not ready after timeout')
        toast.error('Failed to load draft - form not ready')
        await chrome.storage.local.remove('pendingDraftLoad')
        return
      }

      console.log('[Reddit Drafter] Form is ready, fetching draft...')

      // Load the draft
      const draft = await getDraft(pendingDraftLoad)

      if (!draft) {
        console.error('[Reddit Drafter] Draft not found:', pendingDraftLoad)
        toast.error('Draft not found')
        await chrome.storage.local.remove('pendingDraftLoad')
        return
      }

      console.log('[Reddit Drafter] Draft found:', {
        id: draft.id,
        title: draft.title,
        bodyLength: draft.body?.length || 0,
        subreddit: draft.subreddit
      })

      // Additional wait to ensure React components are fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('[Reddit Drafter] Additional delay complete, injecting draft...')

      // Inject draft into form (skip warning since this is intentional)
      const result = await loadDraftIntoForm(draft, true)
      console.log('[Reddit Drafter] Injection result:', result)

      if (result.success) {
        toast.success('Draft loaded successfully!')
        if (result.hasMedia) {
          setTimeout(() => {
            toast.warning(
              `This draft has ${result.mediaCount} attached file(s). Please re-attach them manually.`,
              { duration: 5000 }
            )
          }, 500)
        }
      } else {
        toast.error(result.error || 'Failed to load draft')
      }

      // Clear pending load
      await chrome.storage.local.remove('pendingDraftLoad')
    }
  } catch (error) {
    console.error('[Reddit Drafter] Error checking pending draft load:', error)
    await chrome.storage.local.remove('pendingDraftLoad')
  }
}

// Handle parse and save request from popup
async function handleParseAndSave(): Promise<{ success: boolean; draft?: RedditDraft; error?: string }> {
  try {
    // Initialize storage if needed
    await initStorage()

    // Detect Reddit variant and parse form
    const variant = detectRedditVariant()
    console.log(`[handleParseAndSave] Parsing form from ${variant} Reddit...`)

    let parsedData: Partial<RedditDraft>

    switch (variant) {
      case 'old':
        parsedData = parseOldRedditForm()
        break
      case 'new':
        parsedData = parseNewRedditForm()
        break
      case 'sh':
        parsedData = parseSHRedditForm()
        break
      default:
        return { success: false, error: `Unsupported Reddit variant: ${variant}` }
    }

    console.log('[handleParseAndSave] Parsed data:', {
      title: parsedData.title,
      subreddit: parsedData.subreddit,
      postType: parsedData.postType,
      bodyLength: parsedData.body?.length || 0
    })

    // Validate draft
    const validation = validateDraft({
      title: parsedData.title || '',
      subreddit: parsedData.subreddit || '',
      postType: parsedData.postType || 'text',
      link: parsedData.link,
      pollOptions: parsedData.pollOptions,
      pollDuration: parsedData.pollDuration
    })

    if (!validation.valid) {
      console.warn('[handleParseAndSave] Draft validation failed:', validation.errors)
      return { success: false, error: validation.errors.join(', ') }
    }

    // Check if parsed content has any data
    const hasContent =
      !!(parsedData.title && parsedData.title.trim()) ||
      !!(parsedData.body && parsedData.body.trim()) ||
      !!(parsedData.link && parsedData.link.trim()) ||
      !!(parsedData.pollOptions && parsedData.pollOptions.some(opt => opt.text.trim())) ||
      !!parsedData.flair ||
      !!(parsedData.tags && parsedData.tags.length) ||
      !!(parsedData.notes && parsedData.notes.trim())

    if (!hasContent) {
      console.warn('[handleParseAndSave] No content detected in form')
      return { success: false, error: 'No content detected to save' }
    }

    // Create draft
    const draft = await createDraft({
      title: parsedData.title || '',
      body: parsedData.body || '',
      subreddit: parsedData.subreddit || '',
      postType: parsedData.postType || 'text',
      link: parsedData.link,
      pollOptions: parsedData.pollOptions,
      pollDuration: parsedData.pollDuration,
      nsfw: parsedData.nsfw || false,
      spoiler: parsedData.spoiler || false,
      oc: parsedData.oc || false,
      sendReplies: parsedData.sendReplies ?? true,
      postToProfile: parsedData.postToProfile || false,
      redditUsername: parsedData.redditUsername || 'unknown',
      tags: parsedData.tags || [],
      notes: parsedData.notes || '',
      favorite: parsedData.favorite || false,
      flair: parsedData.flair
    })

    console.log('[handleParseAndSave] Draft saved successfully:', draft.id)

    // Notify popup to refresh
    chrome.runtime.sendMessage({ type: 'DRAFT_SAVED' }).catch(() => {
      // Popup might not be open, that's okay
    })

    return { success: true, draft }
  } catch (error) {
    console.error('[handleParseAndSave] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Main content script initialization
async function init() {
  const variant = detectRedditVariant()
  console.log(`[Reddit Drafter] Initializing on ${variant} Reddit...`)

  try {
    // Create Shadow DOM sidebar
    const { mountPoint } = createShadowDOMSidebar({
      containerId: 'reddit-drafter-root',
      appId: 'reddit-drafter-app',
      styles // Pass CSS string directly
    })

    // Mount React app inside Shadow DOM
    mountReactApp(mountPoint, RedditSidebarApp)

    // Mount Toaster OUTSIDE Shadow DOM for proper styling
    const toasterContainer = document.createElement('div')
    toasterContainer.id = 'reddit-drafter-toaster'
    document.body.appendChild(toasterContainer)

    const toasterRoot = ReactDOM.createRoot(toasterContainer)
    toasterRoot.render(<Toaster position="top-center" className="z-[9999]" />)

    console.log('[Reddit Drafter] Shadow DOM sidebar injected successfully!')

    // Check for pending draft load from popup
    await checkPendingDraftLoad()
  } catch (error) {
    console.error('[Reddit Drafter] Failed to initialize:', error)
  }
}

// Export onExecute for vite-plugin-crx loader
export function onExecute() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}

// Run immediately if not using the loader (for compatibility)
if (typeof onExecute !== 'undefined') {
  onExecute()
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PARSE_AND_SAVE') {
    console.log('[Reddit Drafter] Received PARSE_AND_SAVE request from popup')
    handleParseAndSave().then(sendResponse)
    return true // Keep message channel open for async response
  }
})
