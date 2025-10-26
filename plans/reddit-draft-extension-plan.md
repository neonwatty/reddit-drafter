# Reddit Draft Extension - Detailed Implementation Plan

## ⚠️ Plan Updates (Latest Revision)

**Key Changes from Original Plan:**

1. **Build System:** Changed from WXT → **Vite + @crxjs/vite-plugin**
   - Chrome-first approach (add Firefox later if needed)
   - Full control over configuration
   - Excellent HMR for rapid development
   - Direct Chrome API access (no abstraction layer)
   - Smaller bundle size

2. **Architecture:** Changed from button injection → **Shadow DOM sidebar** approach
   - Sidebar hidden by default, toggleable via FAB or `Ctrl+Shift+D`
   - Better UX, more space for features, isolated from Reddit's styles

3. **Data Model:** Added missing fields
   - `pollDuration` (CRITICAL - polls need 1-7 day duration)
   - `redditUsername` (multi-account support)
   - `postToProfile` (profile vs subreddit posts)
   - `suggestedSort` (comment sorting preference)

4. **UI Framework:** Committed to **shadcn/ui** (not just Tailwind)
   - Added Sheet, Command, Sonner, and other Radix UI components
   - Modern, accessible components with consistent styling

5. **Reddit Variants:** Now supporting **3 variants** (not just 2)
   - old.reddit.com ✓
   - new.reddit.com ✓
   - **sh.reddit.com** ← NEW (latest Reddit UI)

6. **User Preferences:**
   - **Manual save only** (no auto-save per user request)
   - **Always warn before overwriting** form content
   - **Only on submit pages** (not all Reddit pages)

7. **Keyboard Shortcuts:** Comprehensive set defined
   - `Ctrl+Shift+D` - Toggle sidebar
   - `Ctrl+K` - Command palette
   - `Ctrl+Shift+S` - Quick save (fixed from Ctrl+S to avoid browser conflict)
   - Plus navigation and editor shortcuts

8. **Timeline:** More realistic estimate
   - 20-25 days part-time (vs original 28 days)
   - Focused on sidebar-first approach in early phases

9. **Critical Technical Fixes (Latest Review):**
   - **CSS Injection:** Fixed Shadow DOM style injection using Constructable Stylesheets
   - **shadcn/ui Portals:** Added container prop configuration for portal components
   - **Media Interception:** Specified capture-phase event listeners for file cloning
   - **Removed WXT References:** Switched fully to direct `chrome.storage` API
   - **Username Detection:** Added parser logic for each Reddit variant
   - **Poll Validation:** Added 2-6 options, 1-7 day duration rules
   - **Keyboard Shortcuts:** Changed `Ctrl+S` to `Ctrl+Shift+S` to avoid browser conflicts
   - **Storage Limits:** Updated to "hundreds of MB to GB" (more accurate)
   - **Background Script:** Clarified minimal usage (message passing only)
   - **Error Recovery:** Added IndexedDB failure fallback strategies

---

## Project Overview

**Goal:** Build a Chrome extension (with future Firefox support) that allows users to save draft Reddit posts locally with full metadata and media support, then manually post them later.

**Build System:** Vite + @crxjs/vite-plugin (Chrome-first approach)

**Tech Stack:**
- **Vite 5** - Lightning-fast build tool with HMR
- **@crxjs/vite-plugin** - Chrome extension development with HMR
- **TypeScript** - Type safety
- **React 18+** - UI framework
- **Dexie.js** - IndexedDB wrapper for storage
- **shadcn/ui** - Accessible UI components (Tailwind CSS + Radix UI)
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

**Dependencies:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "dexie": "^3.2.4",
    "lucide-react": "^0.294.0",
    "sonner": "^1.3.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.21",
    "@types/chrome": "^0.0.258",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

---

## 1. Data Architecture

### 1.1 Draft Data Model

```typescript
interface RedditDraft {
  // Identity
  id: string;                    // UUID v4
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp

  // Post Content
  title: string;
  body: string;                  // Markdown text for text posts
  subreddit: string;             // e.g., "AskReddit"

  // Post Type
  postType: 'text' | 'link' | 'image' | 'video' | 'poll' | 'gallery';

  // Type-Specific Data
  link?: string;                 // URL for link posts
  imageIds?: string[];           // References to MediaFile IDs
  videoId?: string;              // Reference to MediaFile ID
  pollOptions?: PollOption[];    // For poll posts
  pollDuration?: number;         // Poll duration in days (1-7) - REQUIRED for polls

  // Reddit Metadata
  flair?: {
    id: string;
    text: string;
    templateId?: string;
  };
  nsfw: boolean;
  spoiler: boolean;
  oc: boolean;                   // Original content flag
  sendReplies: boolean;          // Send reply notifications
  postToProfile: boolean;        // Post to user profile vs subreddit
  suggestedSort?: 'best' | 'new' | 'controversial' | 'old' | 'qa';  // Comment sorting

  // Account Context
  redditUsername: string;        // Which Reddit account owns this draft

  // Organization
  tags: string[];                // User-defined tags
  notes: string;                 // Personal notes
  favorite: boolean;             // Pin important drafts

  // State
  lastEditedField?: string;      // For recovery
  crosspostParent?: string;      // Parent post ID if crossposting
}

interface MediaFile {
  id: string;                    // UUID v4
  draftId: string;               // Parent draft reference
  name: string;                  // Original filename
  type: string;                  // MIME type (image/jpeg, video/mp4, etc.)
  size: number;                  // Bytes
  dataUrl: string;               // base64 encoded data URL
  thumbnail?: string;            // base64 thumbnail for videos/large images
  captionText?: string;          // Caption for images in gallery
  captionUrl?: string;           // Link in caption
  order: number;                 // For gallery ordering
  uploadedAt: number;            // Timestamp
}

interface PollOption {
  text: string;     // Max 255 characters
  order: number;    // 0-indexed position (0-5, since Reddit allows 2-6 options)
}

// Poll Validation Rules
interface PollValidationRules {
  minOptions: 2;
  maxOptions: 6;
  minDuration: 1;   // days
  maxDuration: 7;   // days
  maxOptionLength: 255; // characters
}

interface DraftFilters {
  subreddit?: string;
  postType?: string;
  tags?: string[];
  favorite?: boolean;
  searchQuery?: string;
  dateRange?: {
    start: number;
    end: number;
  };
}
```

### 1.2 Storage Strategy

**chrome.storage.local** (direct Chrome API, no WXT)
- Draft metadata summaries (for quick popup display)
- User preferences
- Recently used subreddits (for autocomplete)
- Limit: ~10MB total (chrome.storage.local quota)

**IndexedDB** (via Dexie.js) ← **PRIMARY STORAGE**
- Full draft objects with all metadata
- Media files (images, videos) as base64 data URLs
- Draft content and body text
- Limit: Hundreds of MB to GB (browser dependent, check via `navigator.storage.estimate()`)
- **Why IndexedDB:** Much larger quota, structured queries, media support

**Storage Schema:**

```typescript
// Dexie Database Schema
class DraftsDatabase extends Dexie {
  drafts!: Table<RedditDraft>;
  media!: Table<MediaFile>;

  constructor() {
    super('RedditDrafterDB');
    this.version(1).stores({
      drafts: 'id, subreddit, postType, createdAt, updatedAt, *tags, favorite',
      media: 'id, draftId, uploadedAt'
    });
  }
}
```

**Sync Strategy:**
- Use `chrome.storage.sync` for preferences only (100KB limit)
- Keep drafts local to avoid sync limits
- Provide export/import for manual cross-device transfer

---

## 2. Project Structure

```
reddit-drafter/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts               # Vite configuration with @crxjs
├── manifest.json                # Chrome extension manifest (source of truth)
├── tailwind.config.js
├── postcss.config.js
├── README.md
│
├── src/
│   ├── popup/
│   │   ├── index.html           # Popup HTML entry
│   │   ├── main.tsx             # Popup entry point
│   │   └── App.tsx              # Main popup app (all drafts)
│   │
│   ├── content/
│   │   ├── reddit.tsx           # Content script entry (Shadow DOM setup)
│   │   └── sidebar/             # Injected sidebar components
│   │       ├── RedditSidebarApp.tsx   # Root sidebar component
│   │       ├── SidebarToggle.tsx      # FAB to toggle sidebar
│   │       ├── QuickSave.tsx          # Save current form
│   │       ├── QuickLoad.tsx          # Load draft to form
│   │       ├── RecentDrafts.tsx       # Mini draft list
│   │       └── sidebar.css            # Sidebar-specific styles
│   │
│   ├── background.ts            # Service worker (minimal usage)
│   │
│   └── globals.css              # Global Tailwind styles
│
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (lowercase convention)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx        # For sidebar
│   │   │   ├── popover.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── label.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── command.tsx      # For draft search palette
│   │   │   └── sonner.tsx       # Toast notifications
│   │
│   │   │
│   │   ├── drafts/
│   │   │   ├── DraftList.tsx        # List of all drafts
│   │   │   ├── DraftCard.tsx        # Individual draft preview
│   │   │   ├── DraftEditor.tsx      # Edit draft modal
│   │   │   ├── DraftFilters.tsx     # Filter/search UI
│   │   │   └── DraftActions.tsx     # Bulk actions (delete, export)
│   │   │
│   │   ├── media/
│   │   │   ├── MediaUploader.tsx    # Drag & drop uploader
│   │   │   ├── MediaGallery.tsx     # Display uploaded media
│   │   │   ├── MediaPreview.tsx     # Single media preview
│   │   │   └── ImageOptimizer.tsx   # Compress images before save
│   │   │
│   │   ├── reddit/
│   │   │   ├── SubredditSelector.tsx   # Autocomplete subreddit input
│   │   │   ├── FlairSelector.tsx       # Flair picker
│   │   │   ├── PostTypeSelector.tsx    # Tab selector for post type
│   │   │   ├── RedditPreview.tsx       # Preview how post will look
│   │   │   └── ConflictDialog.tsx      # Warn before overwriting form
│   │   │
│   │   └── settings/
│   │       ├── SettingsPanel.tsx    # User preferences
│   │       ├── ExportImport.tsx     # Backup/restore drafts
│   │       └── StorageStats.tsx     # Show storage usage
│   │
│   ├── lib/
│   │   ├── storage/
│   │   │   ├── db.ts                # Dexie database instance
│   │   │   ├── drafts.ts            # Draft CRUD operations
│   │   │   ├── media.ts             # Media file operations
│   │   │   └── preferences.ts       # User preferences storage
│   │   │
│   │   ├── reddit/
│   │   │   ├── variant-detector.ts  # Detect Reddit UI version
│   │   │   ├── parsers/             # Separate parsers per Reddit variant
│   │   │   │   ├── parse-old.ts     # old.reddit.com parser
│   │   │   │   ├── parse-new.ts     # new.reddit.com parser
│   │   │   │   └── parse-sh.ts      # sh.reddit.com parser
│   │   │   ├── selectors/           # CSS selectors per variant
│   │   │   │   ├── old-selectors.ts
│   │   │   │   ├── new-selectors.ts
│   │   │   │   └── sh-selectors.ts
│   │   │   ├── injector.ts          # Fill Reddit form from draft
│   │   │   ├── media-interceptor.ts # Capture file uploads
│   │   │   └── api-types.ts         # Reddit data structures
│   │   │
│   │   ├── shadow-dom/
│   │   │   ├── create-sidebar.ts    # Shadow DOM sidebar setup
│   │   │   └── style-injector.ts    # Inject CSS into shadow DOM
│   │   │
│   │   ├── keyboard/
│   │   │   └── shortcuts.ts         # Keyboard shortcut handlers
│   │   │
│   │   ├── utils/
│   │   │   ├── media.ts             # Image/video compression
│   │   │   ├── export.ts            # Export drafts as JSON
│   │   │   ├── import.ts            # Import drafts from JSON
│   │   │   ├── search.ts            # Search/filter logic
│   │   │   └── validation.ts        # Input validation
│   │   │
│   │   └── types.ts                 # Shared TypeScript types
│   │
│   └── hooks/
│       ├── useDrafts.ts             # React hook for draft operations
│       ├── useMedia.ts              # React hook for media operations
│       ├── useStorage.ts            # React hook for storage stats
│       └── useRedditContext.ts      # Detect Reddit page context
│
├── public/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       ├── icon-96.png
│       └── icon-128.png
│
├── dist/                            # Build output (gitignored, load in Chrome)
│
└── plans/
    └── reddit-draft-extension-plan.md
```

---

## 3. Core Features

### 3.1 Draft Management

**Create Draft:**
- From Reddit's post creation page: Manual save via sidebar button or `Ctrl+Shift+S`
- From extension popup: "New Draft" button
- **Manual save only** (no auto-save per user preference)
- Duplicate existing draft

**Read/List Drafts:**
- Display all drafts in popup with preview cards
- Show: title, subreddit, post type, date, favorite status
- Sort by: date created, date modified, subreddit, post type
- Filter by: subreddit, post type, tags, favorites
- Search: title and body text

**Update Draft:**
- Edit in-place in popup or open dedicated editor
- Track last modified time
- Preserve media attachments

**Delete Draft:**
- Single delete with confirmation
- Bulk delete selected drafts
- Delete associated media files from IndexedDB

### 3.2 Reddit Integration

**Content Script Features:**
- Detect when user is on Reddit post creation page
- Inject "Save to Drafts" button near "Post" button
- Inject "Load Draft" dropdown to populate form
- Parse current form state to create draft
- Fill form from selected draft
- Handle all post types (text, link, image, video, poll, gallery)

**Supported Pages:**
- new.reddit.com/submit
- old.reddit.com/r/[subreddit]/submit
- www.reddit.com/r/[subreddit]/submit

**Extract from Form:**
- Title input
- Body/text area (with markdown)
- Subreddit selection
- Post type tabs
- Link URL
- Image/video uploads (convert to base64)
- Flair selection
- NSFW, Spoiler, OC checkboxes

### 3.3 Media Handling

**Supported Media:**
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, MOV, WebM
- Galleries: Multiple images

**Processing:**
- Convert to base64 data URLs for storage
- Compress large images (optional, user preference)
- Generate thumbnails for videos and large images
- Validate file sizes (warn if >5MB per file)
- Limit gallery to 20 images (Reddit's limit)

**Storage Optimization:**
- Warn when approaching storage limits
- Show storage usage stats
- Option to compress/optimize media
- Option to delete media from old drafts

### 3.4 Export/Import

**Export:**
- JSON format with embedded media (base64)
- Include all drafts or selected drafts
- Download as `.json` file
- Optional: exclude media to reduce file size

**Import:**
- Upload `.json` file
- Validate format
- Merge or replace existing drafts
- Handle duplicate IDs gracefully

### 3.5 Keyboard Shortcuts

**Global Shortcuts (on Reddit submit pages):**
- `Ctrl/Cmd + Shift + D` - Toggle sidebar open/close
- `Ctrl/Cmd + K` - Open command palette for draft search
- `Ctrl/Cmd + Shift + S` - Quick save current form to draft (avoids browser "Save Page" conflict)
- `Esc` - Close sidebar or command palette

**Note:** Original plan had `Ctrl+S` but this conflicts with browser's "Save Page" command. Changed to `Ctrl+Shift+S` to avoid confusion.

**Within Sidebar:**
- `↑` / `↓` - Navigate recent drafts list
- `Enter` - Load selected draft
- `Delete` - Delete selected draft (with confirmation)

**Within Draft Editor:**
- `Ctrl/Cmd + Enter` - Save and close editor
- `Esc` - Cancel and close editor

### 3.6 User Preferences

**Settings:**
- ~~Auto-save interval~~ (REMOVED: manual save only per user preference)
- Image compression quality (default: 85%)
- Max image size before compression (default: 2MB)
- Default draft tags
- Theme (light/dark/auto)
- Notifications (show after save, etc.)
- Sidebar default state (hidden/visible)
- Keyboard shortcuts customization

**Storage:**
- Use `chrome.storage.sync` for preferences
- Fallback to `chrome.storage.local` if sync unavailable

---

## 4. User Interface

### 4.1 Popup UI (Primary Interface)

**Dimensions:** 400px × 600px

**Layout:**
```
┌─────────────────────────────────────┐
│  Reddit Drafter            [⚙️]     │
├─────────────────────────────────────┤
│  [🔍 Search drafts...]              │
│  [📁 All] [⭐ Favorites] [🏷️ Tags] │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ 📝 My awesome post idea       │ │
│  │ r/AskReddit • Text • 2h ago   │ │
│  │ Lorem ipsum dolor sit...      │ │
│  │ [Edit] [Delete] [Use]         │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │ 🖼️ Check out this image       │ │
│  │ r/pics • Image • 1d ago       │ │
│  │ [Image thumbnail]             │ │
│  │ [Edit] [Delete] [Use]         │ │
│  └───────────────────────────────┘ │
│  ...                                │
├─────────────────────────────────────┤
│  [+ New Draft]                      │
└─────────────────────────────────────┘
```

**Features:**
- Sticky search bar at top
- Filter tabs below search
- Scrollable draft list
- Each card shows key info
- Actions on hover/tap
- "New Draft" always visible at bottom

### 4.2 Draft Editor Modal

**Full-screen overlay or large modal**

```
┌─────────────────────────────────────────────┐
│  Edit Draft                        [✕]      │
├─────────────────────────────────────────────┤
│  Subreddit: [r/________________]            │
│                                             │
│  Post Type: [Text] Link Image Video Poll    │
│                                             │
│  Title: [_____________________________]     │
│                                             │
│  Body:                                      │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │  Markdown editor                    │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Flair: [None ▼]                            │
│  ☑ NSFW  ☐ Spoiler  ☐ OC                   │
│                                             │
│  Tags: [tag1] [tag2] [+ Add]                │
│  Notes: [Personal notes...]                 │
│                                             │
│  [Cancel]              [Save Draft]         │
└─────────────────────────────────────────────┘
```

### 4.3 Injected Sidebar (Primary Interface on Reddit)

**Implementation: Shadow DOM Sidebar**

A slide-in sidebar injected into Reddit's DOM, isolated via Shadow DOM:

```
┌────────────────────────────────────────────┐
│  Reddit Page (Submit Form)                 │
│                                        ┌───┤
│  Title: [_______________]              │ S │
│                                        │ I │
│  Text: [________________              │ D │
│        _________________              │ E │
│        _________________]              │ B │
│                                        │ A │
│  [NSFW] [Spoiler]                     │ R │
│                                        │   │
│  [Post]                               │ • Save Draft
│                                        │ • Recent Drafts:
│                                        │   - Draft 1
│  [🎯] ← FAB Toggle                    │   - Draft 2
│                                        │ • Search All...
└────────────────────────────────────────┴───┘
```

**Features:**
- **Hidden by default** - toggle with FAB button or `Ctrl+Shift+D`
- **Fixed right position** - slides in/out with animation
- **Shadow DOM isolated** - styles won't conflict with Reddit
- **Quick actions:**
  - Save current form to draft (manual only, no auto-save)
  - Load recent drafts (warns before overwriting)
  - Search all drafts (opens command palette)
- **Only on submit pages:** `/r/*/submit` and `/submit`

**Toggle Button (FAB):**
- Floating action button fixed bottom-right
- Shows draft count badge
- Keyboard shortcut: `Ctrl/Cmd + Shift + D`

---

## 5. Technical Implementation

### 5.1 Vite + @crxjs Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        // @crxjs handles content scripts and popup automatically from manifest
        // Only specify additional entry points if needed
      }
    }
  }
})
```

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "Reddit Drafter",
  "version": "1.0.0",
  "description": "Save and manage Reddit post drafts locally with full metadata support",

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "*://*.reddit.com/*",
    "*://sh.reddit.com/*"
  ],

  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },

  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png",
    "128": "icons/icon-128.png"
  },

  "content_scripts": [
    {
      "matches": [
        "*://*.reddit.com/*/submit",
        "*://*.reddit.com/submit",
        "*://sh.reddit.com/*/submit",
        "*://sh.reddit.com/submit"
      ],
      "js": ["src/content/reddit.tsx"]
    }
  ],

  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },

  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["*://*.reddit.com/*", "*://sh.reddit.com/*"]
    }
  ]
}

/**
 * NOTE: Background service worker is minimal
 * Purpose: Message passing between popup and content scripts if needed
 * Most logic runs in content scripts (access to Reddit DOM) and popup (UI)
 */
```

**src/background.ts (Minimal):**
```typescript
// Minimal background script for Chrome MV3
// Most functionality is in content scripts and popup

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reddit Drafter] Extension installed');
});

// Optional: Message passing between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages if needed
  // Most communication should be direct (popup ↔ content script via tabs.sendMessage)
  return false; // Synchronous response
});
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    /* Chrome extension types */
    "types": ["chrome", "node"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**PostCSS Configuration (postcss.config.js):**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Tailwind Configuration (tailwind.config.js):**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // shadcn/ui theme variables
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other shadcn/ui colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**src/globals.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... shadcn/ui CSS variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}
```

### 5.2 Storage Layer

**lib/storage/db.ts:**
```typescript
import Dexie, { Table } from 'dexie';
import type { RedditDraft, MediaFile } from '../types';

export class DraftsDatabase extends Dexie {
  drafts!: Table<RedditDraft>;
  media!: Table<MediaFile>;

  constructor() {
    super('RedditDrafterDB');
    this.version(1).stores({
      drafts: 'id, subreddit, postType, createdAt, updatedAt, *tags, favorite',
      media: 'id, draftId, uploadedAt'
    });
  }
}

export const db = new DraftsDatabase();
```

**lib/storage/drafts.ts:**
```typescript
import { db } from './db';
import type { RedditDraft, DraftFilters } from '../types';
import { v4 as uuid } from 'uuid';

export async function createDraft(draft: Omit<RedditDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<RedditDraft> {
  const newDraft: RedditDraft = {
    ...draft,
    id: uuid(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.drafts.add(newDraft);
  return newDraft;
}

export async function updateDraft(id: string, updates: Partial<RedditDraft>): Promise<void> {
  await db.drafts.update(id, {
    ...updates,
    updatedAt: Date.now()
  });
}

export async function deleteDraft(id: string): Promise<void> {
  // Delete associated media first
  await db.media.where('draftId').equals(id).delete();
  // Then delete draft
  await db.drafts.delete(id);
}

export async function getDraft(id: string): Promise<RedditDraft | undefined> {
  return db.drafts.get(id);
}

export async function listDrafts(filters?: DraftFilters): Promise<RedditDraft[]> {
  let query = db.drafts.toCollection();

  if (filters?.subreddit) {
    query = db.drafts.where('subreddit').equals(filters.subreddit);
  }

  if (filters?.favorite) {
    query = db.drafts.where('favorite').equals(true);
  }

  // Apply additional filters...

  return query.reverse().sortBy('updatedAt');
}
```

### 5.3 Shadow DOM Sidebar Implementation

**src/content/reddit.tsx:**
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import RedditSidebarApp from './sidebar/RedditSidebarApp';
// Import CSS as string using Vite's ?inline modifier
import styles from '@/globals.css?inline';

// Create Shadow DOM container with Constructable Stylesheets
function createShadowDOMContainer(): { container: HTMLElement; shadowRoot: ShadowRoot } {
  const container = document.createElement('div');
  container.id = 'reddit-drafter-root';

  // Attach shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create mount point inside shadow DOM
  const mountPoint = document.createElement('div');
  mountPoint.id = 'reddit-drafter-app';
  shadowRoot.appendChild(mountPoint);

  // CRITICAL FIX: Use Constructable Stylesheets for Shadow DOM
  // This works with @crxjs bundling, unlike fetching CSS files
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(styles);
  shadowRoot.adoptedStyleSheets = [styleSheet];

  return { container, shadowRoot };
}

// Main content script
(function initRedditDrafter() {
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Create and inject shadow DOM container
    const { container, shadowRoot } = createShadowDOMContainer();
    document.body.appendChild(container);

    // Mount React app inside shadow DOM
    const mountPoint = shadowRoot.getElementById('reddit-drafter-app');
    if (mountPoint) {
      const root = createRoot(mountPoint);
      root.render(
        <React.StrictMode>
          <RedditSidebarApp />
        </React.StrictMode>
      );
    }
  }
})();
```

**Alternative: Using lib/shadow-dom/create-sidebar.ts (cleaner):**

```typescript
// src/lib/shadow-dom/create-sidebar.ts
import { Root, createRoot } from 'react-dom/client';

interface ShadowDOMOptions {
  containerId: string;
  appId: string;
  styles: string; // CSS as string (imported via Vite ?inline)
}

export function createShadowDOMSidebar(
  options: ShadowDOMOptions
): { shadowRoot: ShadowRoot; mountPoint: HTMLElement } {
  // Create container
  const container = document.createElement('div');
  container.id = options.containerId;

  // Attach shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create mount point
  const mountPoint = document.createElement('div');
  mountPoint.id = options.appId;
  shadowRoot.appendChild(mountPoint);

  // FIXED: Use Constructable Stylesheets instead of fetching
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(options.styles);
  shadowRoot.adoptedStyleSheets = [styleSheet];

  // Append to body
  document.body.appendChild(container);

  return { shadowRoot, mountPoint };
}

export function mountReactApp(mountPoint: HTMLElement, App: React.ComponentType): Root {
  const root = createRoot(mountPoint);
  root.render(<App />);
  return root;
}
```

**src/content/reddit.tsx (using helper):**
```typescript
import React from 'react';
import { createShadowDOMSidebar, mountReactApp } from '@/lib/shadow-dom/create-sidebar';
import RedditSidebarApp from './sidebar/RedditSidebarApp';
import styles from '@/globals.css?inline'; // Import CSS as string

(function initRedditDrafter() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const { mountPoint } = createShadowDOMSidebar({
      containerId: 'reddit-drafter-root',
      appId: 'reddit-drafter-app',
      styles // Pass CSS string directly
    });

    mountReactApp(mountPoint, RedditSidebarApp);
  }
})();
```

**src/content/sidebar/RedditSidebarApp.tsx:**
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import QuickSave from './QuickSave';
import RecentDrafts from './RecentDrafts';

export default function RedditSidebarApp() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <div ref={containerRef}>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={() => setOpen(!open)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform"
          title="Toggle Reddit Drafter (Ctrl+Shift+D)"
        >
          <FileText className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar using shadcn/ui Sheet */}
      {/* CRITICAL: Pass container prop to keep portals inside Shadow DOM */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px]"
          // IMPORTANT: Configure portal container for Shadow DOM compatibility
          // Some shadcn components render to document.body by default
          // We need to override this to stay within Shadow DOM
          container={containerRef.current}
        >
          <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4">Reddit Drafter</h2>

            <QuickSave onSave={() => {/* save logic */}} />

            <div className="mt-6 flex-1 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Recent Drafts</h3>
              <RecentDrafts onLoad={() => {/* load logic */}} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

**Note on shadcn/ui + Shadow DOM:**
Many Radix UI primitives (used by shadcn/ui) render portals to `document.body` by default. This breaks Shadow DOM isolation. You MUST:
1. Pass a `container` prop to portal-based components (Sheet, Dialog, Popover, DropdownMenu)
2. The container should be a ref to an element inside the Shadow DOM
3. Check shadcn/ui component docs for portal configuration options

If a component doesn't support custom container, you may need to:
- Modify the shadcn component code to accept container prop
- Or disable portals entirely (loses overlay behavior)

### 5.4 Reddit Integration

**lib/reddit/variant-detector.ts:**
```typescript
export type RedditVariant = 'old' | 'new' | 'sh' | 'unknown';

export function detectRedditVariant(): RedditVariant {
  const hostname = window.location.hostname;

  if (hostname === 'old.reddit.com') return 'old';
  if (hostname === 'sh.reddit.com') return 'sh';
  if (hostname.includes('reddit.com')) {
    // Detect new Reddit by checking for React root
    if (document.querySelector('#react-root') ||
        document.querySelector('[data-redditstyle]')) {
      return 'new';
    }
  }

  return 'unknown';
}
```

**lib/reddit/parsers/parse-new.ts:**
```typescript
export function parseRedditForm(): Partial<RedditDraft> {
  // Detect new vs old Reddit
  const isNewReddit = window.location.hostname === 'new.reddit.com';

  if (isNewReddit) {
    return parseNewRedditForm();
  } else {
    return parseOldRedditForm();
  }
}

function parseNewRedditForm(): Partial<RedditDraft> {
  // Find form elements in new Reddit UI
  const titleInput = document.querySelector('[name="title"]') as HTMLInputElement;
  const bodyInput = document.querySelector('[name="text"]') as HTMLTextAreaElement;
  const subredditInput = document.querySelector('[name="sr"]') as HTMLInputElement;

  // Parse post type from active tab
  const postType = detectPostType();

  // Extract metadata
  const nsfw = document.querySelector('[name="nsfw"]')?.checked || false;
  const spoiler = document.querySelector('[name="spoiler"]')?.checked || false;
  const oc = document.querySelector('[name="original_content"]')?.checked || false;

  // ADDED: Extract Reddit username for multi-account support
  const redditUsername = detectRedditUsername();

  return {
    title: titleInput?.value || '',
    body: bodyInput?.value || '',
    subreddit: subredditInput?.value || '',
    postType,
    nsfw,
    spoiler,
    oc,
    redditUsername, // Track which account owns this draft
    sendReplies: true, // Default to true
    favorite: false,
    tags: [],
    notes: ''
  };
}

/**
 * Detect currently logged-in Reddit username
 * Different selectors for each Reddit variant
 */
function detectRedditUsername(): string {
  // Try new Reddit selector
  const newRedditUser = document.querySelector('[data-testid="user-dropdown-toggle"]')?.textContent?.trim();
  if (newRedditUser) return newRedditUser.replace(/^u\//, '');

  // Try old Reddit selector
  const oldRedditUser = document.querySelector('.user a')?.textContent?.trim();
  if (oldRedditUser) return oldRedditUser;

  // Try sh.reddit.com selector (unknown, need to reverse-engineer)
  const shRedditUser = document.querySelector('[data-username]')?.getAttribute('data-username');
  if (shRedditUser) return shRedditUser;

  // Fallback: unknown user
  return 'unknown';
}

function detectPostType(): RedditDraft['postType'] {
  // Logic to detect which tab is active
  // Check for active class on post type buttons
  const activeTab = document.querySelector('[role="tablist"] [aria-selected="true"]');
  const tabText = activeTab?.textContent?.toLowerCase();

  if (tabText?.includes('image')) return 'image';
  if (tabText?.includes('video')) return 'video';
  if (tabText?.includes('link')) return 'link';
  if (tabText?.includes('poll')) return 'poll';

  return 'text';
}
```

**lib/reddit/injector.ts (Form Population):**
```typescript
import type { RedditDraft } from '@/lib/types';
import { detectRedditVariant } from './variant-detector';
import { toast } from 'sonner';

export async function loadDraftIntoForm(draft: RedditDraft): Promise<boolean> {
  // Warn before overwriting (user preference: always warn)
  const hasContent = checkFormHasContent();

  if (hasContent) {
    const confirmed = await showOverwriteWarning();
    if (!confirmed) return false;
  }

  const variant = detectRedditVariant();

  try {
    switch (variant) {
      case 'old':
        await populateOldRedditForm(draft);
        break;
      case 'new':
        await populateNewRedditForm(draft);
        break;
      case 'sh':
        await populateSHRedditForm(draft);
        break;
      default:
        throw new Error('Unsupported Reddit variant');
    }

    toast.success('Draft loaded successfully!');
    return true;
  } catch (error) {
    toast.error('Failed to load draft');
    console.error('Draft load error:', error);
    return false;
  }
}

function checkFormHasContent(): boolean {
  // Check if title or body fields have content
  const titleInput = document.querySelector('[name="title"]') as HTMLInputElement;
  const bodyInput = document.querySelector('[name="text"]') as HTMLTextAreaElement;

  return !!(titleInput?.value || bodyInput?.value);
}

async function showOverwriteWarning(): Promise<boolean> {
  // Show confirmation dialog (implementation depends on UI framework)
  return confirm('Replace current form content with draft?');
}
```

**lib/reddit/media-interceptor.ts (CRITICAL for capturing media):**
```typescript
import { db } from '@/lib/storage/db';
import { v4 as uuid } from 'uuid';
import type { MediaFile } from '@/lib/types';

/**
 * CRITICAL: Media Interception Strategy
 *
 * Challenge: Reddit uploads files immediately on file input change.
 * By the time we react, the File object reference may be gone.
 *
 * Solution: Use capture-phase event listeners to intercept BEFORE Reddit.
 * Clone File objects immediately to preserve them.
 */

export function initMediaInterceptor(draftId: string) {
  // Listen for file input changes in CAPTURE phase (before Reddit)
  document.addEventListener('change', handleFileInputChange, { capture: true });

  // Store intercepted files
  const interceptedFiles: File[] = [];

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;

    // Check if this is a file input
    if (target.type !== 'file' || !target.files || target.files.length === 0) {
      return;
    }

    // IMMEDIATELY clone File objects (they're references that can be cleared)
    const files = Array.from(target.files).map(file => {
      // Use File.slice() to create a true copy
      return file.slice(0, file.size, file.type);
    });

    console.log(`[Media Interceptor] Captured ${files.length} files`, files);

    // Store for later processing
    interceptedFiles.push(...files);

    // Process files asynchronously (convert to base64, generate thumbnails)
    processMediaFiles(files, draftId).catch(err => {
      console.error('[Media Interceptor] Failed to process files:', err);
    });
  }

  // Return cleanup function
  return {
    cleanup: () => {
      document.removeEventListener('change', handleFileInputChange, { capture: true });
    },
    getFiles: () => interceptedFiles
  };
}

/**
 * Process media files: convert to base64, generate thumbnails
 */
async function processMediaFiles(files: File[], draftId: string): Promise<MediaFile[]> {
  const mediaFiles: MediaFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Convert to base64 data URL
    const dataUrl = await fileToDataURL(file);

    // Generate thumbnail for videos and large images
    let thumbnail: string | undefined;
    if (file.type.startsWith('video/')) {
      thumbnail = await generateVideoThumbnail(file);
    } else if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
      // Generate thumbnail for images > 1MB
      thumbnail = await generateImageThumbnail(dataUrl);
    }

    const mediaFile: MediaFile = {
      id: uuid(),
      draftId,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      thumbnail,
      order: i,
      uploadedAt: Date.now()
    };

    // Save to IndexedDB
    await db.media.add(mediaFile);
    mediaFiles.push(mediaFile);
  }

  return mediaFiles;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      video.currentTime = 1; // Seek to 1 second
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(video.src);
    };

    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

async function generateImageThumbnail(dataUrl: string, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = reject;
    img.src = dataUrl;
  });
}
```

### 5.5 React Hooks

**hooks/useDrafts.ts:**
```typescript
import { useState, useEffect } from 'react';
import { listDrafts, createDraft, updateDraft, deleteDraft } from '@/lib/storage/drafts';
import type { RedditDraft, DraftFilters } from '@/lib/types';

export function useDrafts(filters?: DraftFilters) {
  const [drafts, setDrafts] = useState<RedditDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const results = await listDrafts(filters);
      setDrafts(results);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [JSON.stringify(filters)]);

  return {
    drafts,
    loading,
    error,
    refresh,
    createDraft: async (draft) => {
      await createDraft(draft);
      await refresh();
    },
    updateDraft: async (id, updates) => {
      await updateDraft(id, updates);
      await refresh();
    },
    deleteDraft: async (id) => {
      await deleteDraft(id);
      await refresh();
    }
  };
}
```

---

## 6. Error Recovery & Validation

### 6.1 Poll Validation

**Rules:**
```typescript
function validatePoll(options: PollOption[], duration?: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check option count
  if (options.length < 2) errors.push('Polls require at least 2 options');
  if (options.length > 6) errors.push('Polls cannot have more than 6 options');

  // Check option text length
  options.forEach((opt, i) => {
    if (!opt.text.trim()) errors.push(`Option ${i + 1} cannot be empty`);
    if (opt.text.length > 255) errors.push(`Option ${i + 1} exceeds 255 character limit`);
  });

  // Check duration
  if (duration !== undefined) {
    if (duration < 1) errors.push('Poll duration must be at least 1 day');
    if (duration > 7) errors.push('Poll duration cannot exceed 7 days');
  } else {
    errors.push('Poll duration is required');
  }

  return { valid: errors.length === 0, errors };
}
```

### 6.2 IndexedDB Error Recovery

**Strategy:**
```typescript
import { db } from './db';

/**
 * Initialize storage with fallback to chrome.storage.local if IndexedDB fails
 */
export async function initStorage() {
  try {
    // Try to open IndexedDB
    await db.open();
    console.log('[Storage] IndexedDB initialized successfully');
    return { type: 'indexeddb' as const, db };
  } catch (error) {
    console.error('[Storage] IndexedDB failed to initialize:', error);

    // Fallback to chrome.storage.local (limited capacity)
    console.warn('[Storage] Falling back to chrome.storage.local');
    return { type: 'chrome-storage' as const };
  }
}

/**
 * Check storage quota and warn user
 */
export async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usagePercent = (estimate.usage! / estimate.quota!) * 100;

    if (usagePercent > 80) {
      return {
        warning: true,
        message: `Storage is ${usagePercent.toFixed(1)}% full. Consider deleting old drafts or exporting to free up space.`,
        usage: estimate.usage,
        quota: estimate.quota
      };
    }
  }

  return { warning: false };
}
```

### 6.3 Dexie Schema Migrations

**Example migration for adding new fields:**
```typescript
export class DraftsDatabase extends Dexie {
  drafts!: Table<RedditDraft>;
  media!: Table<MediaFile>;

  constructor() {
    super('RedditDrafterDB');

    // Version 1: Initial schema
    this.version(1).stores({
      drafts: 'id, subreddit, postType, createdAt, updatedAt, *tags, favorite',
      media: 'id, draftId, uploadedAt'
    });

    // Version 2: Add redditUsername index for multi-account support
    this.version(2).stores({
      drafts: 'id, subreddit, postType, createdAt, updatedAt, *tags, favorite, redditUsername',
      media: 'id, draftId, uploadedAt'
    }).upgrade(async tx => {
      // Add redditUsername to existing drafts
      const drafts = await tx.table('drafts').toArray();
      for (const draft of drafts) {
        if (!draft.redditUsername) {
          await tx.table('drafts').update(draft.id, { redditUsername: 'unknown' });
        }
      }
    });
  }
}
```

### 6.4 Subreddit Autocomplete Data

**Strategy: User History + Popular Subreddits**
```typescript
interface SubredditHistory {
  name: string;
  lastUsed: number;
  useCount: number;
}

/**
 * Get subreddit suggestions for autocomplete
 * Combines user history with popular subreddits
 */
export async function getSubredditSuggestions(query: string): Promise<string[]> {
  const suggestions = new Set<string>();

  // 1. Get user's recent subreddits from drafts
  const recentDrafts = await db.drafts
    .orderBy('updatedAt')
    .reverse()
    .limit(50)
    .toArray();

  const userSubreddits = new Map<string, SubredditHistory>();
  recentDrafts.forEach(draft => {
    const existing = userSubreddits.get(draft.subreddit);
    if (existing) {
      existing.useCount++;
      existing.lastUsed = Math.max(existing.lastUsed, draft.updatedAt);
    } else {
      userSubreddits.set(draft.subreddit, {
        name: draft.subreddit,
        lastUsed: draft.updatedAt,
        useCount: 1
      });
    }
  });

  // 2. Add user's subreddits that match query
  Array.from(userSubreddits.values())
    .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 10)
    .forEach(s => suggestions.add(s.name));

  // 3. Add popular subreddits if query matches
  const popularSubreddits = [
    'AskReddit', 'funny', 'gaming', 'aww', 'pics', 'science',
    'worldnews', 'videos', 'todayilearned', 'movies', 'music',
    'books', 'television', 'news', 'gifs', 'food', 'sports'
  ];

  popularSubreddits
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .forEach(s => suggestions.add(s));

  return Array.from(suggestions).slice(0, 10);
}
```

### 6.5 Dark Mode Detection

**Strategy: Detect and match Reddit's theme**
```typescript
export function detectRedditTheme(): 'light' | 'dark' {
  const variant = detectRedditVariant();

  switch (variant) {
    case 'old':
      // old.reddit doesn't have dark mode by default (RES adds it)
      return 'light';

    case 'new':
      // Check for dark mode class or data attribute
      if (document.documentElement.classList.contains('theme-dark') ||
          document.documentElement.getAttribute('data-theme') === 'dark') {
        return 'dark';
      }
      return 'light';

    case 'sh':
      // sh.reddit.com theme detection (need to reverse-engineer)
      // Placeholder for now
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';

    default:
      return 'light';
  }
}

/**
 * Apply theme to extension UI
 */
export function applyTheme(theme: 'light' | 'dark' | 'auto') {
  const container = document.getElementById('reddit-drafter-root');
  if (!container) return;

  if (theme === 'auto') {
    theme = detectRedditTheme();
  }

  // Add/remove dark class for Tailwind
  if (theme === 'dark') {
    container.shadowRoot?.querySelector('#reddit-drafter-app')?.classList.add('dark');
  } else {
    container.shadowRoot?.querySelector('#reddit-drafter-app')?.classList.remove('dark');
  }
}
```

---

## 7. Development Phases

### Phase 1: Foundation (3-4 days)

**Step 1.1: Initialize Project**
```bash
# Create Vite project with React + TypeScript
npm create vite@latest reddit-drafter -- --template react-ts
cd reddit-drafter

# Install dependencies
npm install

# Install @crxjs/vite-plugin
npm install @crxjs/vite-plugin --save-dev

# Install Chrome extension types
npm install @types/chrome --save-dev

# Install core dependencies
npm install dexie uuid
npm install @types/uuid --save-dev

# Install Lucide icons and Sonner
npm install lucide-react sonner
```

**Step 1.2: Configure Build System**
- [x] Project planning
- [ ] Create `vite.config.ts` with @crxjs plugin
- [ ] Create `manifest.json` in root
- [ ] Update `tsconfig.json` with path aliases and Chrome types

**Step 1.3: Set up Tailwind CSS**
```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn/ui dependencies
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
```
- [ ] Configure `tailwind.config.js` with shadcn/ui presets
- [ ] Create `src/globals.css` with Tailwind directives and CSS variables
- [ ] Create `src/lib/utils.ts` (cn helper for shadcn/ui)

**Step 1.4: Initialize shadcn/ui**
```bash
# Initialize shadcn/ui (will prompt for configuration)
npx shadcn-ui@latest init

# Add base components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add scroll-area
```

**Step 1.5: Set up Project Structure**
- [ ] Create folder structure as documented
- [ ] Create `src/lib/types.ts` with RedditDraft interface
- [ ] Set up Dexie database schema (with pollDuration, redditUsername, etc.)
- [ ] Build basic storage layer (CRUD operations)

**Step 1.6: Test Build**
```bash
# Start dev server
npm run dev

# Load extension in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist/` folder
```

### Phase 2: Sidebar UI (4-5 days) ← PRIMARY FOCUS
- [ ] Create `src/lib/shadow-dom/create-sidebar.ts` helper
- [ ] Build `src/content/reddit.tsx` with Shadow DOM setup
- [ ] Build `src/content/sidebar/RedditSidebarApp.tsx` with Sheet component
- [ ] Create FAB (Floating Action Button) toggle button
- [ ] Implement `QuickSave.tsx` component (manual save only)
- [ ] Implement `QuickLoad.tsx` component (with overwrite warning dialog)
- [ ] Build `RecentDrafts.tsx` mini-list component
- [ ] Add keyboard shortcuts (Ctrl+Shift+D, Esc)
- [ ] Test sidebar on Reddit submit pages (old.reddit, new.reddit)
- [ ] Verify CSS isolation (no conflicts with Reddit's styles)

### Phase 3: Reddit Integration (4-5 days)
- [ ] Build variant-detector.ts (old, new, sh)
- [ ] Create parse-old.ts for old.reddit.com
- [ ] Create parse-new.ts for new.reddit.com
- [ ] Create parse-sh.ts for sh.reddit.com ← NEW
- [ ] Implement media-interceptor.ts (capture file inputs before Reddit uploads)
- [ ] Build form population (injector.ts) for all 3 variants
- [ ] Test on different Reddit post types (text, link, image, video, poll, gallery)
- [ ] Verify poll duration capture

### Phase 4: Full Draft Management (3-4 days)
- [ ] Build popup UI (400x600px) for all drafts
- [ ] Create DraftList and DraftCard components
- [ ] Implement search and filters
- [ ] Create DraftEditor modal (full-featured)
- [ ] Add tags and favorites
- [ ] Implement export/import
- [ ] Add storage stats display

### Phase 5: Media Support (3-4 days)
- [ ] Build media upload component
- [ ] Implement image compression (browser-image-compression)
- [ ] Implement video thumbnail generation (HTML5 Canvas)
- [ ] Store media in IndexedDB
- [ ] Display media in drafts
- [ ] Handle media when loading draft to Reddit
- [ ] Add storage usage tracking and warnings

### Phase 6: Polish & Testing (3-4 days)
- [ ] Add all keyboard shortcuts (Ctrl+K command palette, Ctrl+S quick save)
- [ ] Implement dark mode (match Reddit's theme)
- [ ] Add Sonner toast notifications
- [ ] Cross-browser testing (Chrome, Firefox, Edge)
- [ ] Performance optimization
- [ ] Error handling and validation
- [ ] Write documentation (README)
- [ ] Create demo video/screenshots
- [ ] Prepare for distribution

**Total Timeline: 20-25 days (part-time) or 10-13 days (full-time)**

---

## 7. Testing Strategy

### 7.1 Manual Testing

**Draft Operations:**
- Create draft from Reddit
- Create draft from popup
- Edit existing draft
- Delete single draft
- Delete multiple drafts
- Search/filter drafts
- Tag management

**Reddit Integration:**
- Save form state to draft (all post types)
- Load draft into Reddit form (all post types)
- Verify media transfers correctly
- Test on new Reddit
- Test on old Reddit
- Test on different subreddits

**Media Handling:**
- Upload images (various formats)
- Upload videos
- Upload galleries
- Test compression
- Test large files
- Verify thumbnails

**Edge Cases:**
- Empty drafts
- Very large drafts (10,000+ chars)
- Many drafts (100+)
- Full storage
- Network offline
- Reddit UI changes

### 7.2 Automated Testing (Optional)

**Unit Tests:**
- Storage layer functions
- Parser logic
- Validation functions
- Export/import

**Integration Tests:**
- Draft CRUD with IndexedDB
- Form parsing on mocked Reddit DOM
- Media file handling

**Tools:**
- Vitest for unit tests
- Playwright for E2E testing (if needed)

---

## 8. Distribution

### 8.1 Chrome Web Store

**Requirements:**
- Developer account ($5 one-time fee)
- Privacy policy (if collecting data)
- Screenshots and promotional images
- Detailed description

**Build:**
```bash
npm run build
npm run zip  # WXT creates distribution zip
```

**Submission:**
- Upload zip to Chrome Web Store
- Fill out listing details
- Submit for review (1-3 days)

### 8.2 Firefox Add-ons

**Requirements:**
- Firefox developer account (free)
- Source code review for obfuscated code

**Build:**
```bash
npm run build:firefox
```

**Submission:**
- Upload to addons.mozilla.org
- Automated and manual review

### 8.3 Edge Add-ons

**Similar to Chrome:**
- Microsoft Partner account (free)
- Can often use same build as Chrome
- Faster review than Chrome

### 8.4 Safari Extension (Future)

**Requirements:**
- Apple Developer account ($99/year)
- Convert to Safari Web Extension
- Submit via App Store Connect

**More complex:**
- Requires Xcode and macOS
- Different distribution model
- Worth it only if significant demand

---

## 9. Future Enhancements

### v2.0 Features
- [ ] Templates for common post formats
- [ ] Scheduled posting (would require backend)
- [ ] Sync across devices (would require backend)
- [ ] Collaborative drafts
- [ ] AI writing assistant
- [ ] Analytics on draft usage

### Community Features
- [ ] Share drafts with others
- [ ] Import drafts from URLs
- [ ] Integration with Reddit's native API (if they add draft API)

### Power User Features
- [ ] Vim keybindings
- [ ] Advanced markdown editor
- [ ] Custom CSS themes
- [ ] Backup to cloud storage (Dropbox, Google Drive)

---

## 10. Open Questions & Decisions

### Storage Limits
- **Q:** What's the maximum total storage we should allow?
- **A:** IndexedDB supports hundreds of MB to GB depending on browser and available disk space. Warn users at 80% via `navigator.storage.estimate()`. Let them manage via compression/deletion rather than hard limits.

### Auto-save
- **Q:** Should we auto-save Reddit forms as user types?
- **A:** **No** - Manual save only per user preference. Avoids unwanted saves and respects user control.

### Offline Support
- **Q:** Should extension work completely offline?
- **A:** Yes for draft management, but Reddit integration requires online

### Privacy
- **Q:** Do we collect any analytics or telemetry?
- **A:** No, completely local and private

### Monetization
- **Q:** Free or paid?
- **A:** Free and open source (MIT license)

---

## 11. Success Metrics

**Launch Goals:**
- 100 installs in first month
- <5% uninstall rate
- 4+ star average rating
- 0 critical bugs reported

**User Engagement:**
- Average 5+ drafts saved per user
- 50%+ of users use it weekly
- Export feature used by 10%+ of users

**Technical:**
- <100ms load time for popup
- <50ms for draft operations
- <500KB extension size
- Works on 95%+ of Reddit post pages

---

## 12. Timeline

**Total Estimated Time:** 20-25 days (part-time) or 10-13 days (full-time)

| Days | Phase | Deliverables |
|------|-------|-------------|
| 1-4 | Foundation | WXT + shadcn/ui setup, storage layer, types |
| 5-9 | Sidebar UI | Shadow DOM sidebar with QuickSave/Load, FAB toggle |
| 10-14 | Reddit Integration | All 3 variants (old, new, sh), media interception |
| 15-18 | Full Management | Popup UI, search, export/import, tags |
| 19-22 | Media Support | Upload, compression, thumbnails, storage tracking |
| 23-25 | Polish & Testing | Keyboard shortcuts, dark mode, cross-browser testing |

**MVP (Minimum Viable Product):**
- Shadow DOM sidebar on Reddit submit pages (hidden by default)
- Manual save current form to draft
- Load drafts back to Reddit (with overwrite warning)
- View drafts in popup
- Support text and link posts
- Basic search/filter
- Works on new.reddit.com and old.reddit.com

**v1.0 (Full Release):**
- All post types supported (text, link, image, video, poll, gallery)
- All Reddit variants (old, new, sh)
- Media handling (capture, compression, thumbnails)
- Export/import
- Tags and organization
- Keyboard shortcuts
- Dark mode support
- Settings panel
- Cross-browser (Chrome, Firefox, Edge)

---

## 13. Resources & References

**@crxjs Documentation:**
- https://crxjs.dev/vite-plugin
- https://github.com/crxjs/chrome-extension-tools

**shadcn/ui Documentation:**
- https://ui.shadcn.com/

**Reddit UI Selectors:**
- Need to document current selectors for forms
- May break with Reddit redesigns (monitor)

**Browser Extension Limits:**
- Chrome: https://developer.chrome.com/docs/extensions/mv3/
- Firefox: https://extensionworkshop.com/

**IndexedDB Best Practices:**
- Dexie.js: https://dexie.org/

**Similar Extensions (for inspiration):**
- Reddit Enhancement Suite (RES)
- Later for Reddit (web app, but similar UX)

---

## 14. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Reddit changes UI | High | High | Monitor Reddit updates, maintain parsers for **3 variants** (old, new, sh). Reddit's UI changes frequently - need to document selectors clearly |
| **sh.reddit.com support** | **High** | **High** | **NEW:** Reddit is rolling out sh.reddit.com. Must reverse-engineer selectors and test thoroughly. May need community help to document |
| Storage quota exceeded | Medium | Medium | Warn users at 80%, provide compression options, cleanup tools for old drafts |
| Browser API changes | Low | High | Follow @crxjs updates, test on beta browsers, monitor Chrome extension API changes |
| User data loss | Low | Critical | Implement export, encourage regular backups, add backup reminders |
| Performance issues with many drafts | Medium | Medium | Virtual scrolling, pagination, lazy loading media, IndexedDB indexes on key fields |
| Cross-browser compatibility | Medium | Medium | Test regularly on Chrome, Firefox, Edge. @crxjs supports Chrome primarily. Safari requires different approach |
| **Shadow DOM CSS conflicts** | **Medium** | **Medium** | **FIXED:** Use Constructable Stylesheets (adoptedStyleSheets), test z-index layering with Reddit's modals |
| **Media file access** | **High** | **Medium** | **FIXED:** Use capture-phase event listeners to intercept file inputs BEFORE Reddit processes them |
| **Multiple Reddit accounts** | **Medium** | **Low** | **FIXED:** Track redditUsername field via variant-specific username detection |
| **Poll duration missing** | **Medium** | **High** | **FIXED:** Added pollDuration field with validation (1-7 days, must capture from all 3 Reddit variants) |

---

## Conclusion

This extension solves a real pain point for Reddit power users who want better draft management than Reddit's limited native feature. By keeping everything local, using modern UI components (shadcn/ui), and implementing a non-intrusive sidebar approach, we can ship a high-quality v1.0 in 20-25 days.

**Key Strengths of Updated Plan:**
- **Shadow DOM sidebar** provides better UX than button injection
- **shadcn/ui** ensures modern, accessible components
- **3 Reddit variant support** (old, new, sh) future-proofs the extension
- **Manual save only** respects user control and avoids unwanted saves
- **Comprehensive data model** captures all Reddit post metadata including poll duration
- **@crxjs/vite-plugin** enables HMR and modern development experience
- **Constructable Stylesheets** for proper Shadow DOM CSS injection

**Addressed Gaps (Latest Review):**
- ✓ Poll duration field added (was missing)
- ✓ Multi-account support via redditUsername field
- ✓ sh.reddit.com support planned
- ✓ Shadow DOM CSS isolation strategy defined (Constructable Stylesheets)
- ✓ Media interception approach documented (capture-phase listeners)
- ✓ Keyboard shortcuts fully specified (Ctrl+Shift+S, not Ctrl+S)
- ✓ User preferences aligned (manual save, always warn)
- ✓ **CSS Injection Fixed** - Using Vite ?inline import + adoptedStyleSheets
- ✓ **shadcn/ui Portal Config** - Container props for Shadow DOM compatibility
- ✓ **Username Detection** - Variant-specific selectors for multi-account
- ✓ **Poll Validation** - 2-6 options, 1-7 days, character limits
- ✓ **Error Recovery** - IndexedDB fallback + quota checking
- ✓ **Subreddit Autocomplete** - User history + popular subreddits
- ✓ **Dark Mode Detection** - Variant-specific theme detection
- ✓ **Storage Limits Updated** - Hundreds of MB to GB (accurate)
- ✓ **Background Script Clarified** - Minimal usage, message passing only
- ✓ **WXT References Removed** - Using direct chrome.storage API
- ✓ **Icon Paths Fixed** - Corrected for @crxjs bundling

**Next Steps:**
1. ✓ Plan reviewed and updated
2. Initialize Vite project with @crxjs/vite-plugin
3. Set up shadcn/ui components
4. Start Phase 1: Foundation (storage layer + types)
5. Start Phase 2: Sidebar UI (PRIMARY FOCUS)

The modular architecture and clear separation of concerns (variants, parsers, components) allows for easy maintenance and feature additions in future versions.

---

## 15. Development Workflow

### Quick Start Commands

```bash
# Development (with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Loading Extension in Chrome

**During Development:**
1. Run `npm run dev`
2. Open `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist/` folder
6. Extension will auto-reload when you save files (HMR)

**Reloading After Changes:**
- Most changes auto-reload with HMR
- If sidebar doesn't update, refresh the Reddit page
- If background script changes, click refresh icon on extension card

### Testing Checklist

**For Each Change:**
- [ ] Test on old.reddit.com/r/test/submit
- [ ] Test on new.reddit.com/r/test/submit
- [ ] Test on sh.reddit.com/r/test/submit (if available)
- [ ] Verify Shadow DOM CSS doesn't conflict with Reddit
- [ ] Check console for errors
- [ ] Test keyboard shortcuts
- [ ] Verify storage operations work

### Debugging Tips

**Content Script:**
- Right-click on Reddit page → Inspect → Console
- Look for `reddit-drafter-root` element in DOM
- Check Shadow DOM contents in Elements tab

**Popup:**
- Right-click extension icon → Inspect popup
- Separate DevTools window opens

**Background Script:**
- Go to `chrome://extensions`
- Click "service worker" link under extension
- Opens DevTools for background script

**Storage Inspection:**
```javascript
// In any extension context (popup, content script)
chrome.storage.local.get(null, (items) => console.log(items));

// IndexedDB (in console)
// Open Application tab → IndexedDB → RedditDrafterDB
```

### Common Issues

**Issue: Extension doesn't appear on Reddit**
- Check manifest.json `matches` patterns
- Verify content script is loading (check Console)
- Try hard refresh (Ctrl+Shift+R)

**Issue: Styles not working**
- Verify Tailwind CSS is imported in content script
- Check if CSS is properly injected into Shadow DOM
- Inspect Shadow DOM in DevTools

**Issue: HMR not working**
- Restart `npm run dev`
- Reload extension in `chrome://extensions`
- Clear browser cache

**Issue: Storage not persisting**
- Check browser storage quota
- Verify chrome.storage permissions in manifest
- Check IndexedDB in DevTools Application tab
