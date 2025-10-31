/**
 * Utility functions for building Reddit URLs
 */

export type RedditVariant = 'old' | 'new' | 'sh' | 'unknown'

/**
 * Build a Reddit submit page URL for a given subreddit and variant
 * @param subreddit The subreddit name (without r/ prefix), or empty for universal submit
 * @param variant The Reddit variant (old/new/sh)
 * @param draft Optional draft data to include post type hints in URL
 * @returns Complete submit page URL
 */
export function buildSubmitUrl(
  subreddit: string,
  variant: RedditVariant = 'new',
  draft?: { postType: string; link?: string }
): string {
  const baseUrls: Record<RedditVariant, string> = {
    old: 'https://old.reddit.com',
    new: 'https://www.reddit.com',
    sh: 'https://sh.reddit.com',
    unknown: 'https://www.reddit.com'
  }

  const base = baseUrls[variant]

  let url: string
  if (subreddit && subreddit.trim()) {
    // Remove r/ prefix if present
    const cleanSubreddit = subreddit.replace(/^r\//, '').trim()
    url = `${base}/r/${cleanSubreddit}/submit`
  } else {
    // Universal submit page
    url = `${base}/submit`
  }

  // For link posts, add URL parameter to make Reddit auto-switch to link tab
  if (draft?.postType === 'link' && draft.link) {
    url += `?url=${encodeURIComponent(draft.link)}`
  }

  return url
}

/**
 * Detect the current Reddit variant from hostname
 * @param hostname Optional hostname to check (defaults to window.location.hostname)
 * @returns The detected Reddit variant
 */
export function getCurrentRedditVariant(hostname?: string): RedditVariant {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '')

  if (host === 'old.reddit.com') return 'old'
  if (host === 'sh.reddit.com') return 'sh'
  if (host.includes('reddit.com')) return 'new'

  return 'unknown'
}

/**
 * Extract subreddit name from a Reddit submit URL
 * @param url Optional URL to parse (defaults to window.location)
 * @returns Subreddit name without r/ prefix, or null if not found
 */
export function getCurrentSubredditFromUrl(url?: string): string | null {
  const urlString = url || (typeof window !== 'undefined' ? window.location.pathname : '')
  const match = urlString.match(/\/r\/([^/]+)\/submit/i)
  return match?.[1] || null
}

/**
 * Check if current page is a Reddit submit page
 * @returns True if on a submit page
 */
export function isOnSubmitPage(): boolean {
  if (typeof window === 'undefined') return false
  return /\/submit/.test(window.location.pathname)
}
