import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

interface SaveBannerProps {
  onSaved?: () => void
}

export default function SaveBanner({ onSaved }: SaveBannerProps) {
  const [isOnSubmitPage, setIsOnSubmitPage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingPage, setCheckingPage] = useState(true)

  // Check if current tab is on a Reddit submit page
  useEffect(() => {
    const checkSubmitPage = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const isSubmit = tab.url?.includes('/submit') || false
        setIsOnSubmitPage(isSubmit)
      } catch (error) {
        console.error('[SaveBanner] Failed to check tab:', error)
        setIsOnSubmitPage(false)
      } finally {
        setCheckingPage(false)
      }
    }

    checkSubmitPage()

    // Re-check when tab changes
    const handleTabUpdate = () => {
      setCheckingPage(true)
      checkSubmitPage()
    }

    chrome.tabs.onUpdated.addListener(handleTabUpdate)
    chrome.tabs.onActivated.addListener(handleTabUpdate)

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate)
      chrome.tabs.onActivated.removeListener(handleTabUpdate)
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        toast.error('No active tab found')
        return
      }

      // Send message to content script to parse and save
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'PARSE_AND_SAVE'
      }) as { success: boolean; draft?: any; error?: string }

      if (response.success && response.draft) {
        toast.success(`Draft "${response.draft.title || 'Untitled'}" saved successfully!`)
        onSaved?.()
      } else {
        toast.error(response.error || 'Failed to save draft')
      }
    } catch (error) {
      console.error('[SaveBanner] Failed to save:', error)

      // Check if error is due to content script not being available
      if (error instanceof Error && error.message.includes('Could not establish connection')) {
        toast.error('Cannot connect to page. Please reload the Reddit page and try again.')
      } else {
        toast.error('Failed to save draft')
      }
    } finally {
      setSaving(false)
    }
  }

  // Don't show banner if checking or not on submit page
  if (checkingPage || !isOnSubmitPage) {
    return null
  }

  return (
    <div className="mx-4 mt-4 p-3 border border-primary/50 bg-primary/5 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Save className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Save the current Reddit form as a draft</span>
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
      >
        {saving ? 'Saving...' : 'Save Draft'}
      </Button>
    </div>
  )
}
