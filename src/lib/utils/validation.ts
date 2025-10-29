import type { PollOption } from '../types'
import { POLL_RULES } from '../types'

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate poll options and duration according to Reddit's rules
 */
function validatePoll(
  options: PollOption[],
  duration?: number
): ValidationResult {
  const errors: string[] = []

  // Check option count
  if (options.length < POLL_RULES.minOptions) {
    errors.push(`Polls require at least ${POLL_RULES.minOptions} options`)
  }

  if (options.length > POLL_RULES.maxOptions) {
    errors.push(`Polls cannot have more than ${POLL_RULES.maxOptions} options`)
  }

  // Check option text length and emptiness
  options.forEach((opt, i) => {
    if (!opt.text.trim()) {
      errors.push(`Option ${i + 1} cannot be empty`)
    }
    if (opt.text.length > POLL_RULES.maxOptionLength) {
      errors.push(`Option ${i + 1} exceeds ${POLL_RULES.maxOptionLength} character limit`)
    }
  })

  // Check duration
  if (duration !== undefined) {
    if (duration < POLL_RULES.minDuration) {
      errors.push(`Poll duration must be at least ${POLL_RULES.minDuration} day`)
    }
    if (duration > POLL_RULES.maxDuration) {
      errors.push(`Poll duration cannot exceed ${POLL_RULES.maxDuration} days`)
    }
  } else {
    errors.push('Poll duration is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate draft title
 */
function validateTitle(title: string): ValidationResult {
  const errors: string[] = []

  if (!title.trim()) {
    errors.push('Title is required')
  }

  if (title.length > 300) {
    errors.push('Title cannot exceed 300 characters')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate subreddit name
 */
function validateSubreddit(subreddit: string): ValidationResult {
  const errors: string[] = []

  if (!subreddit.trim()) {
    errors.push('Subreddit is required')
  }

  // Remove r/ prefix if present
  const cleanName = subreddit.replace(/^r\//, '')

  // Subreddit name must be alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(cleanName)) {
    errors.push('Subreddit name can only contain letters, numbers, and underscores')
  }

  if (cleanName.length < 3 || cleanName.length > 21) {
    errors.push('Subreddit name must be between 3 and 21 characters')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate URL for link posts
 */
function validateUrl(url: string): ValidationResult {
  const errors: string[] = []

  if (!url.trim()) {
    errors.push('URL is required for link posts')
  }

  try {
    new URL(url)
  } catch {
    errors.push('Invalid URL format')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate entire draft before saving
 */
export function validateDraft(draft: {
  title: string
  subreddit: string
  postType: string
  link?: string
  pollOptions?: PollOption[]
  pollDuration?: number
}): ValidationResult {
  const errors: string[] = []

  // Validate title
  const titleResult = validateTitle(draft.title)
  errors.push(...titleResult.errors)

  // Validate subreddit
  const subredditResult = validateSubreddit(draft.subreddit)
  errors.push(...subredditResult.errors)

  // Validate based on post type
  if (draft.postType === 'link' && draft.link) {
    const urlResult = validateUrl(draft.link)
    errors.push(...urlResult.errors)
  }

  if (draft.postType === 'poll' && draft.pollOptions) {
    const pollResult = validatePoll(draft.pollOptions, draft.pollDuration)
    errors.push(...pollResult.errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
