/**
 * CSS selectors for sh.reddit.com (new experimental Reddit UI)
 * These are PLACEHOLDERS and need to be updated based on actual DOM structure
 * sh.reddit.com is still being rolled out and structure may change
 */

export const SH_REDDIT_SELECTORS = {
  // Form container - PLACEHOLDER
  form: 'form',

  // Basic fields - PLACEHOLDER
  title: 'input[name="title"], textarea[name="title"]',
  text: 'textarea[name="text"], div[contenteditable="true"]',
  url: 'input[name="url"]',
  subreddit: 'input[name="sr"]',

  // Post type tabs - PLACEHOLDER
  tabList: '[role="tablist"]',
  activeTab: '[aria-selected="true"]',

  // Metadata - PLACEHOLDER
  nsfw: 'input[name="nsfw"], button[aria-label*="NSFW"]',
  spoiler: 'input[name="spoiler"], button[aria-label*="spoiler"]',
  oc: 'input[name="oc"]',
  sendreplies: 'input[name="sendreplies"]',

  // Flair - PLACEHOLDER
  flairButton: 'button[aria-label*="flair"]',

  // Submit button - PLACEHOLDER
  submitButton: 'button[type="submit"]',

  // Username - PLACEHOLDER
  username: '[data-username]',

  // Poll options - PLACEHOLDER
  pollOptionInputs: 'input[name^="poll"]',
  pollDurationSelect: 'select[name*="duration"]',

  // Media - PLACEHOLDER
  fileInput: 'input[type="file"]',
} as const

/**
 * NOTE: These selectors are placeholders and MUST be updated
 * when sh.reddit.com becomes more widely available.
 *
 * To update:
 * 1. Visit sh.reddit.com/submit
 * 2. Inspect the DOM structure
 * 3. Update selectors to match actual elements
 * 4. Test thoroughly
 */
