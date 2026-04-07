import { useEffect } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useCatalogStore } from '@/stores/catalogStore'
import { ERDCanvas } from '@/components/Canvas/ERDCanvas'
import { Sidebar } from '@/components/Sidebar/CatalogTree'
import { Toolbar } from '@/components/Toolbar/ViewControls'
import { DetailPanel } from '@/components/DetailPanel/TableDetail'
import { Legend } from '@/components/Shared/Legend'
import { ErrorBoundary } from '@/components/Shared/ErrorBoundary'
import { ComparePanel } from '@/components/Compare/ComparePanel'
import { useUIStore } from '@/stores/uiStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useShareableURL } from '@/hooks/useShareableURL'
import { setQueryTracker } from '@/api/client'

import 'reactflow/dist/style.css'

// Wire up query cost tracking
setQueryTracker(() => useUIStore.getState().incrementQueryCount())

function AppContent() {
  const { sidebarOpen, detailPanelOpen } = useUIStore()
  const fetchCatalogs = useCatalogStore((s) => s.fetchCatalogs)
  const selectedTables = useCatalogStore((s) => s.selectedTables)

  useKeyboardShortcuts()
  useShareableURL()

  useEffect(() => {
    fetchCatalogs()
  }, [fetchCatalogs])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#1e1e1e]">
      {/* Top navbar — part of the dark frame */}
      <div className="flex-shrink-0">
        <Toolbar />
      </div>

      {/* Body: sidebar + canvas + detail panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar — part of the dark frame, no borders */}
        {sidebarOpen && (
          <aside className="w-72 flex-shrink-0 bg-slate-50 dark:bg-[#1e1e1e] overflow-y-auto">
            <Sidebar />
          </aside>
        )}

        {/* Canvas — inset with rounded corner where it meets the frame */}
        <div className="flex-1 relative min-w-0 bg-white dark:bg-black rounded-tl-xl overflow-hidden">
          <ERDCanvas />
          {selectedTables.length > 0 && <Legend />}
        </div>

        {/* Detail Panel */}
        {detailPanelOpen && (
          <aside className="w-80 flex-shrink-0 bg-white dark:bg-[#222] overflow-y-auto">
            <DetailPanel />
          </aside>
        )}
      </div>

      {/* Comparison overlay */}
      <ComparePanel />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <AppContent />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
