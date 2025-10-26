# Reddit Drafter

> A Chrome extension for managing Reddit post drafts locally with full metadata and media support.

## 🚀 Features

- **Save Reddit Drafts Locally** - Save posts from Reddit's submit page with one click
- **Shadow DOM Sidebar** - Non-intrusive sidebar that slides in/out on Reddit
- **Full Metadata Support** - Preserves title, body, flair, NSFW, spoiler, OC flags, poll duration, and more
- **Multi-Account Support** - Track drafts per Reddit account
- **Media Handling** - Save images, videos, and gallery posts with automatic compression
- **Privacy-First** - All data stored locally in IndexedDB, no cloud sync
- **Modern UI** - Built with shadcn/ui for a polished, accessible interface

## 🛠️ Tech Stack

- **Vite 5** - Lightning-fast build tool with HMR
- **@crxjs/vite-plugin** - Chrome extension development with hot reload
- **TypeScript** - Type safety
- **React 18** - UI framework
- **Dexie.js** - IndexedDB wrapper for local storage
- **shadcn/ui** - Modern, accessible UI components (Tailwind CSS + Radix UI)
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## 📦 Installation

### For Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/reddit-drafter.git
cd reddit-drafter

# Install dependencies
npm install

# Start development server
npm run dev

# Load extension in Chrome:
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist/` folder
```

### For Users

*Coming soon to Chrome Web Store*

## 🎯 Roadmap

- [x] Project planning and architecture
- [ ] Phase 1: Foundation (Vite + shadcn/ui setup, storage layer)
- [ ] Phase 2: Sidebar UI (Shadow DOM sidebar with QuickSave/Load)
- [ ] Phase 3: Reddit Integration (Parse and populate forms for all variants)
- [ ] Phase 4: Full Draft Management (Popup UI, search, filters, tags)
- [ ] Phase 5: Media Support (Upload, compression, thumbnails)
- [ ] Phase 6: Polish & Testing (Keyboard shortcuts, dark mode, cross-browser)

See [plans/reddit-draft-extension-plan.md](plans/reddit-draft-extension-plan.md) for detailed implementation plan.

## 🤝 Contributing

Contributions are welcome! Please read the [detailed plan](plans/reddit-draft-extension-plan.md) to understand the architecture.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Detailed Implementation Plan](plans/reddit-draft-extension-plan.md)
- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [@crxjs Documentation](https://crxjs.dev/vite-plugin)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

---

**Status:** 🚧 Under active development

**Timeline:** 20-25 days (part-time) | 10-13 days (full-time)
