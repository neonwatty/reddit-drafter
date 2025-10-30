// Minimal background script for Chrome MV3
// Most functionality is in content scripts and popup

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reddit Drafter] Extension installed')
})

// Message passing: Forward messages from content script to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message, 'from:', sender.tab?.id)

  // Forward DRAFT_SAVED messages to all extension contexts (including popup)
  if (message.type === 'DRAFT_SAVED') {
    // Broadcast to all extension views (popup, options page, etc.)
    chrome.runtime.sendMessage(message).catch(() => {
      // No listeners, that's okay (popup might be closed)
      console.log('[Background] No listeners for DRAFT_SAVED message')
    })
  }

  sendResponse({ received: true })
  return false // Synchronous response
})
