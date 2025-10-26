import { createShadowDOMSidebar, mountReactApp } from '@/lib/shadow-dom/create-sidebar'
import RedditSidebarApp from './sidebar/RedditSidebarApp'
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

// Main content script initialization
;(function initRedditDrafter() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  function init() {
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

      console.log('[Reddit Drafter] Shadow DOM sidebar injected successfully!')
    } catch (error) {
      console.error('[Reddit Drafter] Failed to initialize:', error)
    }
  }
})()
