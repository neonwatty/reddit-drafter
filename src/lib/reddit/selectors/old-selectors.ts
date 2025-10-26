/**
 * CSS selectors for old.reddit.com
 * Updated as of 2025 - may need adjustment if Reddit changes their DOM
 */

export const OLD_REDDIT_SELECTORS = {
  // Form container
  form: 'form.submit.content',

  // Basic fields
  title: 'textarea[name="title"]',
  text: 'textarea[name="text"]',
  url: 'input[name="url"]',
  subreddit: 'input[name="sr"]',

  // Post type tabs
  tabLink: '.formtabs-content .spacer a[href*="link"]',
  tabText: '.formtabs-content .spacer a[href*="text"]',

  // Metadata checkboxes
  nsfw: 'input[name="nsfw"]',
  spoiler: 'input[name="spoiler"]',
  sendreplies: 'input[name="sendreplies"]',

  // Flair
  flairSelector: '.linkflairlabel',

  // Submit button
  submitButton: 'button[name="submit"]',

  // Username
  username: '.user a',

  // Poll options (old Reddit doesn't support polls natively)
  pollOptions: null,

  // Media
  fileInput: 'input[type="file"]',
} as const
