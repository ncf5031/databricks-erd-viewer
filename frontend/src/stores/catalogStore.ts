/**
 * ERD Viewer - Catalog Store (Zustand)
 *
 * Manages Unity Catalog browsing state: catalogs, schemas, tables.
 */

import { create } from 'zustand'
import type { CatalogInfo, SchemaInfo } from '@/types/catalog'
import type { TableDetail } from '@/types/table'
import { api } from '@/api/client'

interface CatalogState {
  // Data
  catalogs: CatalogInfo[]
  schemas: SchemaInfo[]
  tables: TableDetail[]

  // Selections
  selectedCatalog: string | null
  selectedSchema: string | null
  selectedTables: string[] // Table names shown on canvas

  // Loading states
  loadingCatalogs: boolean
  loadingSchemas: boolean
  loadingTables: boolean
  error: string | null

  // Actions
  fetchCatalogs: (refresh?: boolean) => Promise<void>
  fetchSchemas: (catalog: string, refresh?: boolean) => Promise<void>
  fetchTables: (catalog: string, schema: string, refresh?: boolean) => Promise<void>
  selectCatalog: (catalog: string | null) => void
  selectSchema: (schema: string | null) => void
  toggleTableSelection: (tableName: string) => void
  selectAllTables: () => void
  clearTableSelection: () => void
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalogs: [],
  schemas: [],
  tables: [],
  selectedCatalog: null,
  selectedSchema: null,
  selectedTables: [],
  loadingCatalogs: false,
  loadingSchemas: false,
  loadingTables: false,
  error: null,

  fetchCatalogs: async (refresh = false) => {
    set({ loadingCatalogs: true, error: null })
    try {
      const catalogs = await api.getCatalogs(refresh)
      set({ catalogs, loadingCatalogs: false })
    } catch (e) {
      set({ error: (e as Error).message, loadingCatalogs: false })
    }
  },

  fetchSchemas: async (catalog, refresh = false) => {
    set({ loadingSchemas: true, error: null })
    try {
      const schemas = await api.getSchemas(catalog, refresh)
      set({ schemas, loadingSchemas: false })
    } catch (e) {
      set({ error: (e as Error).message, loadingSchemas: false })
    }
  },

  fetchTables: async (catalog, schema, refresh = false) => {
    set({ loadingTables: true, error: null })
    try {
      const tables = await api.getTables(catalog, schema, refresh)
      set({ tables, loadingTables: false })
    } catch (e) {
      set({ error: (e as Error).message, loadingTables: false })
    }
  },

  selectCatalog: (catalog) => {
    set({
      selectedCatalog: catalog,
      selectedSchema: null,
      schemas: [],
      tables: [],
      selectedTables: [],
    })
    if (catalog) {
      get().fetchSchemas(catalog)
    }
  },

  selectSchema: (schema) => {
    const { selectedCatalog } = get()
    set({
      selectedSchema: schema,
      tables: [],
      selectedTables: [],
    })
    if (selectedCatalog && schema) {
      get().fetchTables(selectedCatalog, schema)
    }
  },

  toggleTableSelection: (tableName) => {
    const { selectedTables } = get()
    if (selectedTables.includes(tableName)) {
      set({ selectedTables: selectedTables.filter((t) => t !== tableName) })
    } else {
      set({ selectedTables: [...selectedTables, tableName] })
    }
  },

  selectAllTables: () => {
    const { tables } = get()
    set({ selectedTables: tables.map((t) => t.name) })
  },

  clearTableSelection: () => {
    set({ selectedTables: [] })
  },
}))
