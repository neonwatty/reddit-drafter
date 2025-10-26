// Minimal background script for Chrome MV3
// Most functionality is in content scripts and popup

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reddit Drafter] Extension installed')
})

// Optional: Message passing between popup and content scripts
chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  // Forward messages if needed
  // Most communication should be direct (popup ↔ content script via tabs.sendMessage)
  return false // Synchronous response
})
