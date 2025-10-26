/**
 * CSS selectors for new.reddit.com (www.reddit.com)
 * Updated as of 2025 - may need adjustment if Reddit changes their DOM
 */

export const NEW_REDDIT_SELECTORS = {
  // Form container
  form: 'form',

  // Basic fields
  title: 'textarea[name="title"], input[name="title"]',
  text: 'textarea[placeholder*="Text"], div[contenteditable="true"][data-text-content]',
  url: 'input[name="url"]',
  subreddit: 'input[name="sr"], button[aria-label*="subreddit"]',

  // Post type tabs
  tabList: '[role="tablist"]',
  activeTab: '[role="tab"][aria-selected="true"]',
  tabPost: '[role="tab"][name="post"]',
  tabImage: '[role="tab"][name="image"]',
  tabLink: '[role="tab"][name="link"]',
  tabVideo: '[role="tab"][name="video"]',
  tabPoll: '[role="tab"][name="poll"]',

  // Metadata toggles/checkboxes
  nsfw: 'input[name="nsfw"], button[aria-label*="NSFW"]',
  spoiler: 'input[name="spoiler"], button[aria-label*="spoiler"]',
  oc: 'input[name="original_content"], button[aria-label*="OC"]',
  sendreplies: 'input[name="sendreplies"]',

  // Flair
  flairButton: 'button[aria-label*="flair"]',
  flairSelector: '[data-flair-template-id]',

  // Submit button
  submitButton: 'button[type="submit"]',

  // Username
  username: '[data-testid="user-dropdown-toggle"]',

  // Poll options
  pollOptionInputs: 'input[name^="poll-option-"]',
  pollDurationSelect: 'select[name="poll-duration"]',

  // Media
  fileInput: 'input[type="file"]',
  imageUploadButton: 'button[aria-label*="upload"]',

  // Gallery
  galleryItems: '[data-gallery-item]',
} as const
