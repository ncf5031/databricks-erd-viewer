/**
 * ERD Viewer - Toolbar / View Controls
 *
 * Top toolbar with layout options, relationship toggle, theme, export, and compare.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDiagramStore } from '@/stores/diagramStore'
import { useUIStore } from '@/stores/uiStore'
import { useCatalogStore } from '@/stores/catalogStore'
import { useComparisonStore } from '@/stores/comparisonStore'
import { useExport } from '@/hooks/useExport'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Rows3,
  Columns3,
  Eye,
  EyeOff,
  Download,
  Upload,
  KeyRound,
  LayoutGrid,
  Image,
  FileCode2,
  FileJson,
  FileType,
  ArrowLeftRight,
  Zap,
  Network,
} from 'lucide-react'
import type { ColumnDisplayMode, LayoutDirection } from '@/types/diagram'

const LAYOUT_CYCLE: { dir: LayoutDirection; label: string; icon: typeof Rows3 }[] = [
  { dir: 'TB', label: 'Top-Bottom', icon: Rows3 },
  { dir: 'LR', label: 'Left-Right', icon: Columns3 },
  { dir: 'FORCE', label: 'Force-Directed', icon: Network },
]

export function Toolbar() {
  const {
    showInferred,
    setShowInferred,
    layoutDirection,
    setLayoutDirection,
    columnDisplayMode,
    setColumnDisplayMode,
    animatedEdges,
    setAnimatedEdges,
  } = useDiagramStore()

  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useUIStore()
  const selectedTables = useCatalogStore((s) => s.selectedTables)
  const { exportPNG, exportSVG, exportDDL, exportJSON, importJSON } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasContent = selectedTables.length > 0

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    if (exportOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  const cycleLayout = useCallback(() => {
    const idx = LAYOUT_CYCLE.findIndex((l) => l.dir === layoutDirection)
    const next = LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length]
    setLayoutDirection(next.dir)
  }, [layoutDirection, setLayoutDirection])

  const currentLayout = LAYOUT_CYCLE.find((l) => l.dir === layoutDirection) || LAYOUT_CYCLE[0]
  const LayoutIcon = currentLayout.icon

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) importJSON(text)
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-imported
  }, [importJSON])

  const columnModes: { mode: ColumnDisplayMode; label: string; icon: typeof LayoutGrid }[] = [
    { mode: 'all', label: 'All columns', icon: LayoutGrid },
    { mode: 'keys', label: 'Keys only', icon: KeyRound },
    { mode: 'none', label: 'Collapsed', icon: Rows3 },
  ]

  return (
    <div className="h-12 flex items-center gap-1 px-3 flex-shrink-0">
      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

      {/* Sidebar toggle */}
      <ToolbarButton
        onClick={toggleSidebar}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-300 dark:bg-[#333] mx-1" />

      {/* Layout direction */}
      {hasContent && (
        <>
          <ToolbarButton
            onClick={cycleLayout}
            title={`Layout: ${currentLayout.label} (click to cycle)`}
            active={false}
          >
            <LayoutIcon size={16} />
            <span className="text-xs ml-1">{currentLayout.dir}</span>
          </ToolbarButton>

          {/* Column display mode */}
          {columnModes.map(({ mode, label, icon: Icon }) => (
            <ToolbarButton
              key={mode}
              onClick={() => setColumnDisplayMode(mode)}
              title={label}
              active={columnDisplayMode === mode}
            >
              <Icon size={14} />
            </ToolbarButton>
          ))}

          <div className="w-px h-5 bg-slate-300 dark:bg-[#333] mx-1" />

          {/* Inferred relationships toggle */}
          <ToolbarButton
            onClick={() => setShowInferred(!showInferred)}
            title={showInferred ? 'Hide inferred relationships' : 'Show inferred relationships'}
            active={showInferred}
          >
            {showInferred ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="text-xs ml-1">Inferred</span>
          </ToolbarButton>

          {/* Animated edges toggle */}
          <ToolbarButton
            onClick={() => setAnimatedEdges(!animatedEdges)}
            title={animatedEdges ? 'Disable edge animation' : 'Enable edge animation'}
            active={animatedEdges}
          >
            <Zap size={14} />
          </ToolbarButton>

          <div className="w-px h-5 bg-slate-300 dark:bg-[#333] mx-1" />

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <ToolbarButton onClick={() => setExportOpen(!exportOpen)} title="Export" active={exportOpen}>
              <Download size={16} />
              <span className="text-xs ml-1">Export</span>
            </ToolbarButton>
            {exportOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 py-1 bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] rounded-lg shadow-lg z-50">
                <ExportMenuItem icon={Image} label="PNG Image" onClick={() => { exportPNG(); setExportOpen(false) }} />
                <ExportMenuItem icon={FileType} label="SVG Vector" onClick={() => { exportSVG(); setExportOpen(false) }} />
                <ExportMenuItem icon={FileCode2} label="DDL (SQL)" onClick={() => { exportDDL(); setExportOpen(false) }} />
                <ExportMenuItem icon={FileJson} label="JSON State" onClick={() => { exportJSON(); setExportOpen(false) }} />
                <div className="border-t border-slate-200 dark:border-[#333] my-1" />
                <ExportMenuItem icon={Upload} label="Import JSON" onClick={() => { handleImport(); setExportOpen(false) }} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Compare button — always visible */}
      <div className="w-px h-5 bg-slate-300 dark:bg-[#333] mx-1" />
      <ToolbarButton
        onClick={() => useComparisonStore.getState().open()}
        title="Compare tables across catalogs"
      >
        <ArrowLeftRight size={16} />
        <span className="text-xs ml-1">Compare</span>
      </ToolbarButton>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Query cost counter */}
      <QueryCostBadge />

      {/* Theme toggle */}
      <ToolbarButton onClick={toggleTheme} title={`Theme: ${theme}`}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </ToolbarButton>
    </div>
  )
}

function QueryCostBadge() {
  const queryCount = useUIStore((s) => s.queryCount)
  if (queryCount === 0) return null
  return (
    <div className="text-xs text-slate-400 dark:text-slate-500 px-2" title="SQL queries executed this session">
      {queryCount} queries
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-sm transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#222]'
      }`}
    >
      {children}
    </button>
  )
}

function ExportMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Image
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2a2940]"
    >
      <Icon size={14} className="text-slate-400" />
      {label}
    </button>
  )
}
