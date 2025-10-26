import { Root, createRoot } from 'react-dom/client'

interface ShadowDOMOptions {
  containerId: string
  appId: string
  styles: string // CSS as string (imported via Vite ?inline)
}

/**
 * Create a Shadow DOM container for the Reddit sidebar
 * Uses Constructable Stylesheets for proper CSS isolation
 */
export function createShadowDOMSidebar(
  options: ShadowDOMOptions
): { shadowRoot: ShadowRoot; mountPoint: HTMLElement; container: HTMLElement } {
  // Create container
  const container = document.createElement('div')
  container.id = options.containerId

  // Attach shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' })

  // Create mount point
  const mountPoint = document.createElement('div')
  mountPoint.id = options.appId
  shadowRoot.appendChild(mountPoint)

  // CRITICAL: Use Constructable Stylesheets for Shadow DOM
  // This works with @crxjs bundling, unlike fetching CSS files
  const styleSheet = new CSSStyleSheet()
  styleSheet.replaceSync(options.styles)
  shadowRoot.adoptedStyleSheets = [styleSheet]

  // Append to body
  document.body.appendChild(container)

  return { shadowRoot, mountPoint, container }
}

/**
 * Mount a React component inside the Shadow DOM
 */
export function mountReactApp(mountPoint: HTMLElement, App: React.ComponentType): Root {
  const root = createRoot(mountPoint)
  root.render(<App />)
  return root
}
