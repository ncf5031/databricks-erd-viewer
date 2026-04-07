/**
 * ERD Viewer - Comparison Store (Zustand)
 *
 * Manages cross-catalog schema comparison state.
 * Each side has its own catalogs, schemas, and tables.
 */

import { create } from 'zustand'
import type { TableComparisonResult, SchemaComparisonResult } from '@/types/comparison'
import type { SchemaInfo } from '@/types/catalog'
import type { TableSummary } from '@/types/table'
import { api } from '@/api/client'

type CompareMode = 'table' | 'schema'

interface ComparisonState {
  isOpen: boolean
  mode: CompareMode

  // Left side
  leftCatalog: string
  leftSchemas: SchemaInfo[]
  leftSchema: string
  leftTables: TableSummary[]
  leftTable: string

  // Right side
  rightCatalog: string
  rightSchemas: SchemaInfo[]
  rightSchema: string
  rightTables: TableSummary[]
  rightTable: string

  result: TableComparisonResult | null
  schemaResult: SchemaComparisonResult | null
  loading: boolean
  error: string | null

  open: () => void
  close: () => void
  setMode: (mode: CompareMode) => void
  setLeftCatalog: (catalog: string) => void
  setLeftSchema: (schema: string) => void
  setLeftTable: (table: string) => void
  setRightCatalog: (catalog: string) => void
  setRightSchema: (schema: string) => void
  setRightTable: (table: string) => void
  runComparison: () => Promise<void>
  runSchemaComparison: () => Promise<void>
  reset: () => void
}

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  isOpen: false,
  mode: 'schema',
  leftCatalog: '',
  leftSchemas: [],
  leftSchema: '',
  leftTables: [],
  leftTable: '',
  rightCatalog: '',
  rightSchemas: [],
  rightSchema: '',
  rightTables: [],
  rightTable: '',
  result: null,
  schemaResult: null,
  loading: false,
  error: null,

  open: () => {
    set({ isOpen: true })
  },
  close: () => set({ isOpen: false }),

  setMode: (mode) => set({ mode, result: null, schemaResult: null, error: null }),

  setLeftCatalog: async (catalog) => {
    set({ leftCatalog: catalog, leftSchemas: [], leftSchema: '', leftTables: [], leftTable: '' })
    if (catalog) {
      try {
        const schemas = await api.getSchemas(catalog)
        set({ leftSchemas: schemas })
      } catch { /* graceful */ }
    }
  },

  setLeftSchema: async (schema) => {
    const { leftCatalog } = get()
    set({ leftSchema: schema, leftTables: [], leftTable: '' })
    if (leftCatalog && schema) {
      try {
        const tables = await api.getTables(leftCatalog, schema)
        set({ leftTables: tables })
      } catch { /* graceful */ }
    }
  },

  setLeftTable: (table) => set({ leftTable: table }),

  setRightCatalog: async (catalog) => {
    set({ rightCatalog: catalog, rightSchemas: [], rightSchema: '', rightTables: [], rightTable: '' })
    if (catalog) {
      try {
        const schemas = await api.getSchemas(catalog)
        set({ rightSchemas: schemas })
      } catch { /* graceful */ }
    }
  },

  setRightSchema: async (schema) => {
    const { rightCatalog } = get()
    set({ rightSchema: schema, rightTables: [], rightTable: '' })
    if (rightCatalog && schema) {
      try {
        const tables = await api.getTables(rightCatalog, schema)
        set({ rightTables: tables })
      } catch { /* graceful */ }
    }
  },

  setRightTable: (table) => set({ rightTable: table }),

  runComparison: async () => {
    const {
      leftCatalog, leftSchema, leftTable,
      rightCatalog, rightSchema, rightTable,
    } = get()

    if (!leftCatalog || !leftSchema || !leftTable || !rightCatalog || !rightSchema || !rightTable) {
      set({ error: 'Select a table on both sides to compare.' })
      return
    }

    set({ loading: true, error: null, result: null })

    try {
      const result = await api.compareTables(
        leftCatalog, leftSchema, leftTable,
        rightCatalog, rightSchema, rightTable,
      )
      set({ result, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  runSchemaComparison: async () => {
    const { leftCatalog, leftSchema, rightCatalog, rightSchema } = get()

    if (!leftCatalog || !leftSchema || !rightCatalog || !rightSchema) {
      set({ error: 'Select a catalog and schema on both sides to compare.' })
      return
    }

    set({ loading: true, error: null, schemaResult: null, result: null })

    try {
      const schemaResult = await api.compareSchemas(
        leftCatalog, leftSchema,
        rightCatalog, rightSchema,
      )
      set({ schemaResult, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  reset: () => set({
    leftCatalog: '', leftSchemas: [], leftSchema: '', leftTables: [], leftTable: '',
    rightCatalog: '', rightSchemas: [], rightSchema: '', rightTables: [], rightTable: '',
    result: null, schemaResult: null, error: null,
  }),
}))
