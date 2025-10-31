import { waitForFormReady, loadDraftIntoForm } from '@/lib/reddit/injector'
import { getDraft, createDraft, updateDraft } from '@/lib/storage/drafts'
import { initStorage } from '@/lib/storage/db'
import { parseOldRedditForm } from '@/lib/reddit/parsers/parse-old'
import { parseNewRedditForm } from '@/lib/reddit/parsers/parse-new'
import { parseSHRedditForm } from '@/lib/reddit/parsers/parse-sh'
import { validateDraft } from '@/lib/utils/validation'
import { processAndSaveImage, processAndSaveVideo, isValidImageType, isValidVideoType } from '@/lib/utils/media'
import { updateMediaFile } from '@/lib/storage/media'
import type { RedditDraft, ParsedFormData } from '@/lib/types'

// Detect Reddit variant for logging
function detectRedditVariant(): string {
  const hostname = window.location.hostname

  if (hostname === 'old.reddit.com') return 'old'
  if (hostname === 'sh.reddit.com') return 'sh'
  if (hostname.includes('reddit.com')) return 'new'

  return 'unknown'
}

// Global guard key to prevent concurrent draft loads across all content script instances
const DRAFT_LOADING_GUARD_KEY = 'draftLoadingInProgress'

// Check for pending draft load from popup
async function checkPendingDraftLoad() {
  try {
    // Check for global guard flag (prevents race conditions across multiple script executions)
    const { [DRAFT_LOADING_GUARD_KEY]: isLoading } = await chrome.storage.local.get(DRAFT_LOADING_GUARD_KEY)
    if (isLoading) {
      console.log('[Reddit Drafter] Draft load already in progress (global guard), skipping...')
      return
    }

    const { pendingDraftLoad } = await chrome.storage.local.get('pendingDraftLoad')

    if (pendingDraftLoad) {
      console.log('[Reddit Drafter] Pending draft load detected:', pendingDraftLoad)

      // Set global guard flag IMMEDIATELY (prevents concurrent executions)
      await chrome.storage.local.set({ [DRAFT_LOADING_GUARD_KEY]: true })

      // Clear pending load IMMEDIATELY to prevent concurrent executions
      await chrome.storage.local.remove('pendingDraftLoad')

      // Initialize storage first
      await initStorage()
      console.log('[Reddit Drafter] Storage initialized')

      // Wait for form to be ready with longer timeout
      console.log('[Reddit Drafter] Waiting for form to be ready...')
      const formReady = await waitForFormReady(10000)

      if (!formReady) {
        console.error('[Reddit Drafter] Form not ready after timeout')
        await chrome.storage.local.remove(DRAFT_LOADING_GUARD_KEY) // Clear global guard flag
        return
      }

      console.log('[Reddit Drafter] Form is ready, fetching draft...')

      // Load the draft
      const draft = await getDraft(pendingDraftLoad)

      if (!draft) {
        console.error('[Reddit Drafter] Draft not found:', pendingDraftLoad)
        await chrome.storage.local.remove(DRAFT_LOADING_GUARD_KEY) // Clear global guard flag
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

      // Clear global guard flag - draft load complete
      await chrome.storage.local.remove(DRAFT_LOADING_GUARD_KEY)
      console.log('[Reddit Drafter] Draft load complete, guard cleared')
    }
  } catch (error) {
    console.error('[Reddit Drafter] Error checking pending draft load:', error)
    await chrome.storage.local.remove(DRAFT_LOADING_GUARD_KEY) // Clear global guard flag on error too
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

    let parsedFormData: ParsedFormData

    switch (variant) {
      case 'old':
        parsedFormData = await parseOldRedditForm()
        break
      case 'new':
        parsedFormData = await parseNewRedditForm()
        break
      case 'sh':
        parsedFormData = await parseSHRedditForm()
        break
      default:
        return { success: false, error: `Unsupported Reddit variant: ${variant}` }
    }

    const parsedData = parsedFormData.draft
    const extractedMedia = parsedFormData.extractedMedia

    console.log('[handleParseAndSave] Parsed data:', {
      title: parsedData.title,
      subreddit: parsedData.subreddit,
      postType: parsedData.postType,
      bodyLength: parsedData.body?.length || 0,
      extractedMediaCount: extractedMedia?.length || 0
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

    // Process and save extracted media files
    if (extractedMedia && extractedMedia.length > 0) {
      console.log(`[handleParseAndSave] Processing ${extractedMedia.length} extracted media files...`)

      const mediaIds: string[] = []
      let videoId: string | undefined

      try {
        for (let i = 0; i < extractedMedia.length; i++) {
          const file = extractedMedia[i]

          if (isValidImageType(file)) {
            // Check if we have a Reddit thumbnail to use
            const redditThumbnailSrc = (file as any).__thumbnailSrc

            // Process and save image (generates thumbnail if not provided by Reddit)
            const mediaFile = await processAndSaveImage(file, draft.id, i)
            mediaIds.push(mediaFile.id)
            console.log(`[handleParseAndSave] Saved image ${i + 1}/${extractedMedia.length}:`, mediaFile.id)

            // If we extracted a Reddit thumbnail, use it (replaces generated thumbnail for consistency with Reddit UI)
            if (redditThumbnailSrc) {
              try {
                const thumbnailBlob = await fetch(redditThumbnailSrc).then(r => r.blob())
                const reader = new FileReader()
                const thumbnailDataUrl = await new Promise<string>((resolve, reject) => {
                  reader.onload = () => resolve(reader.result as string)
                  reader.onerror = reject
                  reader.readAsDataURL(thumbnailBlob)
                })

                // Update media file with Reddit's thumbnail (replaces generated one)
                await updateMediaFile(mediaFile.id, { thumbnail: thumbnailDataUrl })
                console.log('[handleParseAndSave] Replaced generated thumbnail with Reddit thumbnail for', mediaFile.id)
              } catch (error) {
                console.warn('[handleParseAndSave] Failed to download Reddit thumbnail:', error)
                // Not critical - we already have generated thumbnail as fallback
              }
            }
          } else if (isValidVideoType(file)) {
            const mediaFile = await processAndSaveVideo(file, draft.id, i)
            videoId = mediaFile.id
            console.log(`[handleParseAndSave] Saved video:`, mediaFile.id)
          }
        }

        // Update draft with media IDs
        if (mediaIds.length > 0 || videoId) {
          await updateDraft(draft.id, {
            imageIds: mediaIds.length > 0 ? mediaIds : undefined,
            videoId: videoId
          })
          console.log('[handleParseAndSave] Draft updated with media IDs:', { imageIds: mediaIds, videoId })
        }
      } catch (error) {
        console.error('[handleParseAndSave] Failed to process extracted media:', error)
        // Continue even if media processing fails - draft is already saved
      }
    }

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
    // Check for pending draft load from popup
    await checkPendingDraftLoad()
  } catch (error) {
    console.error('[Reddit Drafter] Failed to initialize:', error)
  }
}

// Track if we've already initialized to prevent duplicate executions
let hasInitialized = false

// Export onExecute for vite-plugin-crx loader
export function onExecute() {
  // Prevent duplicate initialization in case this is called multiple times
  if (hasInitialized) {
    console.log('[Reddit Drafter] Already initialized, skipping duplicate init')
    return
  }
  hasInitialized = true

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}

// Auto-initialize (the loader will call onExecute)
onExecute()

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PARSE_AND_SAVE') {
    console.log('[Reddit Drafter] Received PARSE_AND_SAVE request from popup')
    handleParseAndSave().then(sendResponse)
    return true // Keep message channel open for async response
  }
})
