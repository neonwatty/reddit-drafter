import { createShadowDOMSidebar, mountReactApp } from '@/lib/shadow-dom/create-sidebar'
import RedditSidebarApp from './sidebar/RedditSidebarApp'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
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

    // Mount Toaster OUTSIDE Shadow DOM for proper styling
    const toasterContainer = document.createElement('div')
    toasterContainer.id = 'reddit-drafter-toaster'
    document.body.appendChild(toasterContainer)

    const toasterRoot = ReactDOM.createRoot(toasterContainer)
    toasterRoot.render(<Toaster position="top-center" className="z-[9999]" />)

    console.log('[Reddit Drafter] Shadow DOM sidebar injected successfully!')
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
