import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import {
  Search,
  FileText,
  Star,
  Download,
  Upload,
  Trash2,
  Plus,
  Settings,
} from 'lucide-react'
import './command-palette.css'

export interface CommandAction {
  id: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  onSelect: () => void
  group?: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: CommandAction[]
}

export default function CommandPalette({
  open,
  onOpenChange,
  actions,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')

  // Reset search when opened
  useEffect(() => {
    if (open) {
      setSearch('')
    }
  }, [open])

  // Group actions
  const groupedActions = actions.reduce((acc, action) => {
    const group = action.group || 'General'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(action)
    return acc
  }, {} as Record<string, CommandAction[]>)

  if (!open) return null

  return (
    <div className="command-palette-overlay" onClick={() => onOpenChange(false)}>
      <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
        <Command className="command-palette" loop>
          <div className="command-palette-header">
            <Search className="command-palette-search-icon" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="command-palette-input"
            />
          </div>

          <Command.List className="command-palette-list">
            <Command.Empty className="command-palette-empty">
              No results found.
            </Command.Empty>

            {Object.entries(groupedActions).map(([group, groupActions]) => (
              <Command.Group key={group} heading={group} className="command-palette-group">
                {groupActions.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={action.label}
                    onSelect={() => {
                      action.onSelect()
                      onOpenChange(false)
                    }}
                    className="command-palette-item"
                  >
                    {action.icon && (
                      <span className="command-palette-item-icon">{action.icon}</span>
                    )}
                    <span className="command-palette-item-label">{action.label}</span>
                    {action.shortcut && (
                      <kbd className="command-palette-shortcut">{action.shortcut}</kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

// Hook for using command palette with Ctrl+K
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return { open, setOpen }
}

// Predefined icon set for common actions
export const CommandIcons = {
  search: <Search className="h-4 w-4" />,
  create: <Plus className="h-4 w-4" />,
  draft: <FileText className="h-4 w-4" />,
  favorite: <Star className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  import: <Upload className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
}
