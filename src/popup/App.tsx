import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { initStorage } from '@/lib/storage/db'

function App() {
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    initStorage().then(() => {
      setStorageReady(true)
    })
  }, [])

  return (
    <div className="w-[400px] h-[600px] p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Reddit Drafter</h1>
      </div>

      {!storageReady ? (
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">Initializing storage...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Phase 1: Foundation completed ✅
          </p>
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Ready to build:</h2>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✅ Vite + @crxjs configured</li>
              <li>✅ TypeScript + React setup</li>
              <li>✅ Tailwind CSS + shadcn/ui ready</li>
              <li>✅ Dexie.js storage layer</li>
              <li>✅ Complete type definitions</li>
            </ul>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-8">
            Next: Phase 2 - Shadow DOM Sidebar
          </p>
        </div>
      )}
    </div>
  )
}

export default App
