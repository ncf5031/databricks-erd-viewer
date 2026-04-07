/**
 * ERD Viewer - UI Store (Zustand)
 *
 * Manages UI preferences: theme, panel visibility, search.
 */

import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  detailPanelOpen: boolean
  detailPanelTable: string | null
  searchQuery: string
  queryCount: number

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  openDetailPanel: (tableName: string) => void
  closeDetailPanel: () => void
  setSearchQuery: (query: string) => void
  incrementQueryCount: () => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('erd-viewer-theme') as Theme | null
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    return saved
  }
  return 'dark' // Default dark to match Databricks workspace
}

export const useUIStore = create<UIState>((set, get) => {
  // Apply initial theme on store creation
  const initialTheme = getInitialTheme()
  // Defer DOM manipulation to avoid SSR issues
  if (typeof window !== 'undefined') {
    applyTheme(initialTheme)
  }

  return {
    theme: initialTheme,
    sidebarOpen: true,
    detailPanelOpen: false,
    detailPanelTable: null,
    searchQuery: '',
    queryCount: 0,

    setTheme: (theme) => {
      localStorage.setItem('erd-viewer-theme', theme)
      applyTheme(theme)
      set({ theme })
    },

    toggleTheme: () => {
      const { theme } = get()
      const next: Theme = theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('erd-viewer-theme', next)
      applyTheme(next)
      set({ theme: next })
    },

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    openDetailPanel: (tableName) =>
      set({ detailPanelOpen: true, detailPanelTable: tableName }),

    closeDetailPanel: () =>
      set({ detailPanelOpen: false, detailPanelTable: null }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    incrementQueryCount: () => set((s) => ({ queryCount: s.queryCount + 1 })),
  }
})
