/**
 * ERD Viewer - Keyboard Shortcuts Hook
 *
 * Global keyboard shortcuts for common actions:
 * - Ctrl/Cmd+F: Focus search
 * - Ctrl/Cmd+0: Fit to view
 * - Escape: Deselect / close panel
 * - T: Toggle theme
 * - I: Toggle inferred relationships
 * - L: Cycle layout direction
 */

import { useEffect } from 'react'
import { useReactFlow } from 'reactflow'
import { useUIStore } from '@/stores/uiStore'
import { useDiagramStore } from '@/stores/diagramStore'

export function useKeyboardShortcuts() {
  const { toggleTheme, closeDetailPanel, detailPanelOpen, setSearchQuery } = useUIStore()
  const { showInferred, setShowInferred, layoutDirection, setLayoutDirection } = useDiagramStore()

  let reactFlowInstance: ReturnType<typeof useReactFlow> | null = null
  try {
    reactFlowInstance = useReactFlow()
  } catch {
    // Not inside ReactFlowProvider — shortcuts that need it will be skipped
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Ctrl/Cmd shortcuts work even in inputs
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'f') {
        e.preventDefault()
        // Focus the search input in the sidebar
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Filter"]')
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
        return
      }

      if (mod && e.key === '0') {
        e.preventDefault()
        reactFlowInstance?.fitView({ padding: 0.2, duration: 300 })
        return
      }

      // Single-key shortcuts — skip if user is typing in an input
      if (isInput) return

      switch (e.key) {
        case 'Escape':
          if (detailPanelOpen) {
            closeDetailPanel()
          }
          setSearchQuery('')
          break

        case 't':
        case 'T':
          toggleTheme()
          break

        case 'i':
        case 'I':
          setShowInferred(!showInferred)
          break

        case 'l':
        case 'L':
          setLayoutDirection(layoutDirection === 'TB' ? 'LR' : 'TB')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    toggleTheme,
    closeDetailPanel,
    detailPanelOpen,
    setSearchQuery,
    showInferred,
    setShowInferred,
    layoutDirection,
    setLayoutDirection,
    reactFlowInstance,
  ])
}
