import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Star,
  Upload,
  Trash2,
  MoreVertical,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { initStorage } from '@/lib/storage/db'
import {
  listDrafts,
  deleteDraft,
  updateDraft,
  createDraft,
  deleteAllDrafts,
} from '@/lib/storage/drafts'
import DraftList from './components/DraftList'
import SearchBar from './components/SearchBar'
import DraftEditor from './components/DraftEditor'
import StorageStats from './components/StorageStats'
import SaveBanner from './components/SaveBanner'
import {
  exportDraftToFile,
  exportDraftsToFile,
  exportDraftsToCSV,
  importDraftsFromFile,
} from '@/lib/utils/export-import'
import CommandPalette, { useCommandPalette, CommandIcons, type CommandAction } from '@/components/CommandPalette'
import type { RedditDraft } from '@/lib/types'
import { buildSubmitUrl, getCurrentRedditVariant } from '@/lib/utils/url-builder'

function App() {
  const [storageReady, setStorageReady] = useState(false)
  const [drafts, setDrafts] = useState<RedditDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [postTypeFilter, setPostTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [editingDraft, setEditingDraft] = useState<RedditDraft | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette()

  // Initialize storage
  useEffect(() => {
    initStorage().then(() => {
      setStorageReady(true)
      loadDrafts()
    })
  }, [])

  // Listen for messages from content script (when drafts are saved from sidebar)
  useEffect(() => {
    if (!storageReady) return

    const handleMessage = (message: any) => {
      if (message.type === 'DRAFT_SAVED') {
        console.log('[App] Draft saved, reloading drafts...')
        loadDrafts()
      }
    }

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [storageReady])

  // Load drafts
  const loadDrafts = async () => {
    setLoading(true)
    try {
      const allDrafts = await listDrafts()
      setDrafts(allDrafts)
    } catch (error) {
      console.error('[App] Failed to load drafts:', error)
      toast.error('Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort drafts
  const filteredDrafts = useMemo(() => {
    let filtered = drafts

    // Filter by tab
    if (activeTab === 'favorites') {
      filtered = filtered.filter((d) => d.favorite)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.body?.toLowerCase().includes(query) ||
          d.subreddit.toLowerCase().includes(query) ||
          d.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by post type
    if (postTypeFilter !== 'all') {
      filtered = filtered.filter((d) => d.postType === postTypeFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt
        case 'oldest':
          return a.createdAt - b.createdAt
        case 'updated':
          return b.updatedAt - a.updatedAt
        case 'title':
          return a.title.localeCompare(b.title)
        case 'subreddit':
          return a.subreddit.localeCompare(b.subreddit)
        default:
          return 0
      }
    })

    return filtered
  }, [drafts, activeTab, searchQuery, postTypeFilter, sortBy])

  // Handlers
  const handleEdit = (draft: RedditDraft) => {
    setEditingDraft(draft)
    setEditorOpen(true)
  }

  const handleDelete = async (draft: RedditDraft) => {
    if (!confirm(`Delete draft "${draft.title}"?`)) return

    try {
      await deleteDraft(draft.id)
      toast.success('Draft deleted')
      loadDrafts()
    } catch (error) {
      console.error('[App] Failed to delete draft:', error)
      toast.error('Failed to delete draft')
    }
  }

  const handleToggleFavorite = async (draft: RedditDraft) => {
    try {
      await updateDraft(draft.id, {
        favorite: !draft.favorite,
        updatedAt: Date.now(),
      })
      toast.success(draft.favorite ? 'Removed from favorites' : 'Added to favorites')
      loadDrafts()
    } catch (error) {
      console.error('[App] Failed to toggle favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const handleExport = (draft: RedditDraft) => {
    try {
      exportDraftToFile(draft)
      toast.success('Draft exported successfully')
    } catch (error) {
      console.error('[App] Failed to export draft:', error)
      toast.error('Failed to export draft')
    }
  }

  const handleDuplicate = async (draft: RedditDraft) => {
    try {
      await createDraft({
        ...draft,
        title: `${draft.title} (Copy)`,
      })
      toast.success('Draft duplicated')
      loadDrafts()
    } catch (error) {
      console.error('[App] Failed to duplicate draft:', error)
      toast.error('Failed to duplicate draft')
    }
  }

  const handleLoad = async (draft: RedditDraft) => {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        toast.error('No active tab found')
        return
      }

      // Detect Reddit variant (default to 'new' if not on Reddit)
      let variant = getCurrentRedditVariant(tab.url)
      if (variant === 'unknown') {
        variant = 'new' // Default to new Reddit
      }

      // Build submit URL for the draft's subreddit
      const submitUrl = buildSubmitUrl(draft.subreddit, variant)

      // Store draft ID to load after navigation
      await chrome.storage.local.set({ pendingDraftLoad: draft.id })

      // Navigate to submit page
      await chrome.tabs.update(tab.id, { url: submitUrl })

      // Show success message
      toast.success(`Navigating to r/${draft.subreddit || 'Reddit'} submit page...`)

      // Close popup after a short delay
      setTimeout(() => {
        window.close()
      }, 500)
    } catch (error) {
      console.error('[App] Failed to load draft:', error)
      toast.error('Failed to load draft')
    }
  }

  const handleExportAll = () => {
    try {
      exportDraftsToFile(drafts)
      toast.success(`Exported ${drafts.length} drafts`)
    } catch (error) {
      console.error('[App] Failed to export all drafts:', error)
      toast.error('Failed to export drafts')
    }
  }

  const handleExportCSV = () => {
    try {
      exportDraftsToCSV(drafts)
      toast.success(`Exported ${drafts.length} drafts to CSV`)
    } catch (error) {
      console.error('[App] Failed to export CSV:', error)
      toast.error('Failed to export CSV')
    }
  }

  const handleImport = async () => {
    try {
      const result = await importDraftsFromFile()
      if (result.success) {
        toast.success(`Imported ${result.count} drafts`)
        loadDrafts()
      } else {
        toast.error(result.error || 'Failed to import drafts')
      }
    } catch (error) {
      console.error('[App] Failed to import drafts:', error)
      toast.error('Failed to import drafts')
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL ${drafts.length} drafts? This cannot be undone!`)) return

    try {
      await deleteAllDrafts()
      toast.success('All drafts deleted')
      loadDrafts()
    } catch (error) {
      console.error('[App] Failed to delete all drafts:', error)
      toast.error('Failed to delete all drafts')
    }
  }

  // Command Palette Actions
  const commandActions: CommandAction[] = [
    {
      id: 'view-all',
      label: 'View All Drafts',
      icon: CommandIcons.draft,
      shortcut: 'Alt+A',
      onSelect: () => setActiveTab('all'),
      group: 'Navigation',
    },
    {
      id: 'view-favorites',
      label: 'View Favorites',
      icon: CommandIcons.favorite,
      shortcut: 'Alt+F',
      onSelect: () => setActiveTab('favorites'),
      group: 'Navigation',
    },
    {
      id: 'import',
      label: 'Import Drafts from JSON',
      icon: CommandIcons.import,
      shortcut: 'Ctrl+I',
      onSelect: handleImport,
      group: 'Actions',
    },
    {
      id: 'export-json',
      label: 'Export All Drafts (JSON)',
      icon: CommandIcons.export,
      onSelect: handleExportAll,
      group: 'Actions',
    },
    {
      id: 'export-csv',
      label: 'Export All Drafts (CSV)',
      icon: CommandIcons.export,
      onSelect: handleExportCSV,
      group: 'Actions',
    },
    {
      id: 'delete-all',
      label: 'Delete All Drafts',
      icon: CommandIcons.delete,
      onSelect: handleDeleteAll,
      group: 'Danger',
    },
  ]

  return (
    <div className="w-[400px] h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-lg font-bold">Reddit Drafter</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportAll}>
              <FileJson className="mr-2 h-4 w-4" />
              Export All (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export All (CSV)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteAll}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Drafts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!storageReady ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      ) : (
        <>
          {/* Save Banner - only shows when on Reddit submit page */}
          <SaveBanner onSaved={loadDrafts} />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all">
                All ({drafts.length})
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <Star className="h-3 w-3 mr-1" />
                Favorites ({drafts.filter((d) => d.favorite).length})
              </TabsTrigger>
            </TabsList>

            {/* Search and Filters */}
            <div className="mb-3">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                postTypeFilter={postTypeFilter}
                onPostTypeFilterChange={setPostTypeFilter}
                sortBy={sortBy}
                onSortByChange={setSortBy}
              />
            </div>

            <TabsContent value="all" className="flex-1 overflow-hidden mt-0">
              <DraftList
                drafts={filteredDrafts}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onExport={handleExport}
                onDuplicate={handleDuplicate}
                onLoad={handleLoad}
              />
            </TabsContent>

            <TabsContent value="favorites" className="flex-1 overflow-hidden mt-0">
              <DraftList
                drafts={filteredDrafts}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onExport={handleExport}
                onDuplicate={handleDuplicate}
                onLoad={handleLoad}
              />
            </TabsContent>
          </Tabs>

          {/* Storage Stats */}
          <div className="p-4 border-t flex-shrink-0">
            <StorageStats />
          </div>
        </>
      )}

      {/* Draft Editor Modal */}
      <DraftEditor
        draft={editingDraft}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={loadDrafts}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        actions={commandActions}
      />

      {/* Toaster */}
      <Toaster position="top-center" className="z-[9999]" />
    </div>
  )
}

export default App
