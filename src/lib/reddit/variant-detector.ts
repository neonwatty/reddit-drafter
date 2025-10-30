import type { RedditVariant } from '../types'

/**
 * Detect which Reddit UI variant is currently being used
 */
export function detectRedditVariant(): RedditVariant {
  const hostname = window.location.hostname

  if (hostname === 'old.reddit.com') return 'old'
  if (hostname === 'sh.reddit.com') return 'sh'

  if (hostname.includes('reddit.com')) {
    // Detect new Reddit by checking for known root elements (React or Shreddit)
    const hasNewRedditRoot =
      document.querySelector('#react-root') ||
      document.querySelector('[data-redditstyle]') ||
      document.querySelector('shreddit-app') ||
      document.querySelector('faceplate-tracker') ||
      document.querySelector('[data-testid="post-editor"]')

    if (hasNewRedditRoot) return 'new'

    // Fallback: default to new Reddit on standard domains even if markers aren't found yet
    return 'new'
  }

  return 'unknown'
}

/**
 * Detect currently logged-in Reddit username
 * Different selectors for each Reddit variant
 */
export function detectRedditUsername(): string {
  const variant = detectRedditVariant()

  switch (variant) {
    case 'new': {
      // Try new Reddit selectors
      const dropdownToggle = document.querySelector('[data-testid="user-dropdown-toggle"]')?.textContent?.trim()
      if (dropdownToggle) return dropdownToggle.replace(/^u\//, '')

      // Fallback: check for username in header
      const headerUser = document.querySelector('button[id^="USER_DROPDOWN"]')?.textContent?.trim()
      if (headerUser) return headerUser.replace(/^u\//, '')
      break
    }

    case 'old': {
      // old.reddit.com selector
      const userLink = document.querySelector('.user a')?.textContent?.trim()
      if (userLink) return userLink
      break
    }

    case 'sh': {
      // sh.reddit.com selector (needs to be reverse-engineered)
      // Placeholder - may need to be updated based on actual DOM structure
      const shUser = document.querySelector('[data-username]')?.getAttribute('data-username')
      if (shUser) return shUser
      break
    }
  }

  return 'unknown'
}
