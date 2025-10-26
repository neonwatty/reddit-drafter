# Reddit Drafter

A powerful Chrome extension for managing Reddit post drafts locally with full metadata and media support.

![Status](https://img.shields.io/badge/status-ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)

## ✨ Features

### 📝 Complete Draft Management
- Save Reddit posts with all metadata (title, body, subreddit, flair, etc.)
- Support for all post types: text, link, image, video, poll, and gallery
- Organize with tags, notes, and favorites
- Search and filter drafts by type, subreddit, or tags
- Export/import drafts (JSON and CSV formats)

### 🖼️ Media Support
- Upload and store images and videos
- Automatic image compression (saves storage space)
- Video thumbnail generation
- Support for gallery posts (up to 20 images)
- Media file management with size tracking

### ⚡ Quick Actions
- **Sidebar (Reddit pages)**: Quick save/load with FAB button
  - Keyboard shortcut: `Ctrl+Shift+D` to toggle sidebar
  - Keyboard shortcut: `Ctrl+Shift+S` to quick save
- **Popup UI**: Full draft management interface
  - Keyboard shortcut: `Ctrl+K` for command palette
- One-click load drafts back into Reddit forms

### 🎨 Modern UI
- Clean, modern interface built with shadcn/ui
- Shadow DOM isolation (no conflicts with Reddit's CSS)
- Dark mode support (matches system preference)
- Responsive design

### 🔒 Privacy-Focused
- All data stored locally in IndexedDB
- No external servers or data collection
- Complete control over your drafts
- Export your data anytime

## 📦 Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/neonwatty/reddit-drafter.git
   cd reddit-drafter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

## 🚀 Usage

### Saving a Draft

#### From Reddit Submit Page
1. Navigate to any Reddit submit page (old.reddit.com, new.reddit.com, or sh.reddit.com)
2. Fill out your post details
3. Click the floating **Draft** button (bottom-right) or press `Ctrl+Shift+D`
4. Click **"Save Draft"** or press `Ctrl+Shift+S`

### Managing Drafts

1. **Open the Popup**: Click the Reddit Drafter icon in your Chrome toolbar
2. **Search**: Use the search bar to find drafts by title, body, subreddit, or tags
3. **Filter**: Filter by post type (text, link, image, video, poll, gallery)
4. **Sort**: Sort by newest, oldest, recently updated, title, or subreddit
5. **Edit**: Click the menu (⋮) on any draft to edit, favorite, duplicate, export, or delete

### Loading a Draft

#### From Sidebar
1. Open the sidebar on a Reddit submit page (`Ctrl+Shift+D`)
2. View recent drafts in the sidebar
3. Click **"Load"** on any draft
4. Confirm if the form already has content

#### From Popup
1. Open the popup
2. Find the draft you want to load
3. Click the menu (⋮) and select **"Edit"**
4. Review the draft details
5. Navigate to the appropriate subreddit's submit page
6. Use the Load feature from the sidebar

### Command Palette

Press `Ctrl+K` (or `Cmd+K` on Mac) in the popup to open the command palette:

- **View All Drafts**: Switch to all drafts view (`Alt+A`)
- **View Favorites**: Switch to favorites view (`Alt+F`)
- **Import Drafts**: Import from JSON file (`Ctrl+I`)
- **Export All (JSON)**: Export all drafts to JSON
- **Export All (CSV)**: Export all drafts to CSV
- **Delete All Drafts**: Delete all drafts (with confirmation)

### Media Upload

For image, video, and gallery posts:

1. Edit the draft in the popup
2. Go to the **"Media"** tab
3. Click **"Upload Image"** or **"Upload Video"**
4. Select your file(s)
5. Images are automatically compressed to save space
6. Video thumbnails are generated automatically

**Note**: When loading a draft with media, you'll need to manually upload the media files to Reddit. The extension will remind you with a notification.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle sidebar (on Reddit pages) |
| `Ctrl+Shift+S` | Quick save current form (sidebar) |
| `Ctrl+K` | Open command palette (popup) |
| `Esc` | Close sidebar or command palette |

## 💾 Storage

Reddit Drafter uses IndexedDB for local storage:

- **Drafts**: Stored with full metadata
- **Media**: Images and videos stored as compressed data URLs
- **Quota**: Typically hundreds of MB to GB depending on browser
- **Storage Stats**: View usage in the popup (bottom section)

## 🌐 Supported Reddit Variants

- ✅ **old.reddit.com**: Full support
- ✅ **www.reddit.com / new.reddit.com**: Full support
- ⚠️ **sh.reddit.com**: Experimental support (selectors may need updating)

## 🛠️ Development

### Scripts

```bash
# Development server with HMR
npm run dev

# Build for production
npm run build

# Run e2e tests (headless)
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in headed mode
npm run test:e2e:headed
```

### Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6 + @crxjs/vite-plugin
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Storage**: Dexie.js (IndexedDB wrapper)
- **Media**: browser-image-compression
- **Command Palette**: cmdk
- **Testing**: Playwright

### Project Structure

```
reddit-drafter/
├── src/
│   ├── background.ts              # Service worker
│   ├── content/
│   │   ├── reddit.tsx            # Content script entry
│   │   └── sidebar/              # Sidebar components
│   ├── popup/
│   │   ├── App.tsx               # Popup main app
│   │   └── components/           # Popup components
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   └── CommandPalette.tsx    # Command palette
│   └── lib/
│       ├── types.ts              # TypeScript types
│       ├── storage/              # Storage layer
│       ├── reddit/               # Reddit integration
│       └── utils/                # Utilities
├── tests/
│   └── e2e/                      # Playwright e2e tests
├── manifest.json                  # Chrome extension manifest
└── vite.config.ts                # Vite configuration
```

## 🎯 Roadmap

- [x] Phase 1: Foundation (Vite + shadcn/ui setup, storage layer)
- [x] Phase 2: Sidebar UI (Shadow DOM sidebar with QuickSave/Load)
- [x] Phase 3: Reddit Integration (Parse and populate forms for all variants)
- [x] Phase 4: Full Draft Management (Popup UI, search, filters, tags)
- [x] Phase 5: Media Support (Upload, compression, thumbnails)
- [x] Phase 6: Polish & Testing (Keyboard shortcuts, command palette, e2e tests)

## ❓ Troubleshooting

### Draft not loading correctly
- Ensure you're on the correct subreddit's submit page
- Check that the post type matches (text/link/image/video/poll/gallery)
- Some fields may need manual adjustment based on subreddit rules

### Media files not uploading
- Media must be uploaded manually to Reddit after loading the draft
- Check file size limits (images: 20MB, videos: 1GB)
- Ensure browser storage quota isn't exceeded

### Extension not appearing on Reddit pages
- Check that you're on a Reddit submit page
- Verify the extension is enabled in Chrome
- Try refreshing the page

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/) and [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Image compression by [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
- Command palette by [cmdk](https://cmdk.paco.me/)

---

**Made with ❤️ and [Claude Code](https://claude.com/claude-code)**
