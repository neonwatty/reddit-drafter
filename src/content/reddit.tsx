// Content script for Reddit Draft Extension
// This will be enhanced in Phase 2 with Shadow DOM sidebar

console.log('[Reddit Drafter] Content script loaded on Reddit submit page')

// Phase 1: Just log that we're here
// Phase 2: Will inject Shadow DOM sidebar with React app
;(function initRedditDrafter() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  function init() {
    console.log('[Reddit Drafter] Initializing...')

    // Check what Reddit variant we're on
    const hostname = window.location.hostname
    let variant = 'unknown'

    if (hostname === 'old.reddit.com') variant = 'old'
    else if (hostname === 'sh.reddit.com') variant = 'sh'
    else if (hostname.includes('reddit.com')) variant = 'new'

    console.log(`[Reddit Drafter] Detected variant: ${variant}`)

    // Phase 2 will create Shadow DOM sidebar here
    // For now, just verify the content script is loading
  }
})()
