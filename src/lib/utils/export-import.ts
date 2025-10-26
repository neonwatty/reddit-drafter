import type { RedditDraft } from '../types'
import { createDraft } from '../storage/drafts'

/**
 * Export a single draft to JSON file
 */
export function exportDraftToFile(draft: RedditDraft): void {
  const data = JSON.stringify(draft, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `reddit-draft-${draft.title.slice(0, 50).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export multiple drafts to JSON file
 */
export function exportDraftsToFile(drafts: RedditDraft[]): void {
  const data = JSON.stringify(drafts, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `reddit-drafts-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Import drafts from JSON file
 */
export async function importDraftsFromFile(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve({ success: false, error: 'No file selected' })
        return
      }

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        // Handle both single draft and array of drafts
        const drafts = Array.isArray(data) ? data : [data]

        // Validate drafts
        for (const draft of drafts) {
          if (!draft.title || !draft.subreddit || !draft.postType) {
            resolve({ success: false, error: 'Invalid draft format' })
            return
          }
        }

        // Import drafts
        let imported = 0
        for (const draft of drafts) {
          // Create new draft (will get new ID and timestamps)
          await createDraft({
            title: draft.title,
            body: draft.body || '',
            subreddit: draft.subreddit,
            postType: draft.postType,
            link: draft.link,
            pollOptions: draft.pollOptions,
            pollDuration: draft.pollDuration,
            nsfw: draft.nsfw || false,
            spoiler: draft.spoiler || false,
            oc: draft.oc || false,
            sendReplies: draft.sendReplies ?? true,
            postToProfile: draft.postToProfile || false,
            redditUsername: draft.redditUsername || 'imported',
            tags: draft.tags || [],
            notes: draft.notes || '',
            favorite: draft.favorite || false,
            flair: draft.flair,
            suggestedSort: draft.suggestedSort,
          })
          imported++
        }

        resolve({ success: true, count: imported })
      } catch (error) {
        console.error('[importDraftsFromFile] Error:', error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to import',
        })
      }
    }

    input.click()
  })
}

/**
 * Export all drafts as CSV
 */
export function exportDraftsToCSV(drafts: RedditDraft[]): void {
  const headers = [
    'Title',
    'Subreddit',
    'Post Type',
    'Body',
    'Link',
    'NSFW',
    'Spoiler',
    'OC',
    'Tags',
    'Created At',
    'Updated At',
  ]

  const rows = drafts.map((draft) => [
    draft.title,
    draft.subreddit,
    draft.postType,
    draft.body || '',
    draft.link || '',
    draft.nsfw ? 'Yes' : 'No',
    draft.spoiler ? 'Yes' : 'No',
    draft.oc ? 'Yes' : 'No',
    draft.tags.join(', '),
    new Date(draft.createdAt).toISOString(),
    new Date(draft.updatedAt).toISOString(),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma/newline/quote
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `reddit-drafts-${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
