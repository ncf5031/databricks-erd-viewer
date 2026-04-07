/**
 * ERD Viewer - Typed API Client
 *
 * Fetch wrapper for backend API calls with error handling.
 */

import type { CatalogInfo, SchemaInfo } from '@/types/catalog'
import type { TableDetail } from '@/types/table'
import type { Relationship } from '@/types/relationship'
import type { TableComparisonResult, SchemaComparisonResult } from '@/types/comparison'

export interface ColumnLineage {
  source_table: string
  source_column: string
  target_table: string
  target_column: string
}

const API_BASE = '/api'

// Lazy reference to avoid circular import — set by App on mount
let _incrementQueryCount: (() => void) | null = null
export function setQueryTracker(fn: () => void) { _incrementQueryCount = fn }

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  _incrementQueryCount?.()

  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// Catalog & Schema endpoints
export const api = {
  getCatalogs(refresh = false): Promise<CatalogInfo[]> {
    const qs = refresh ? '?refresh=true' : ''
    return fetchJson(`/catalogs${qs}`)
  },

  getSchemas(catalog: string, refresh = false): Promise<SchemaInfo[]> {
    const qs = refresh ? '?refresh=true' : ''
    return fetchJson(`/catalogs/${catalog}/schemas${qs}`)
  },

  getTables(catalog: string, schema: string, refresh = false): Promise<TableDetail[]> {
    const qs = refresh ? '?refresh=true' : ''
    return fetchJson(`/catalogs/${catalog}/schemas/${schema}/tables${qs}`)
  },

  getTableDetail(catalog: string, schema: string, table: string): Promise<TableDetail> {
    return fetchJson(`/catalogs/${catalog}/schemas/${schema}/tables/${table}`)
  },

  getRelationships(
    catalog: string,
    schema: string,
    includeInferred = false,
    refresh = false,
  ): Promise<Relationship[]> {
    const params = new URLSearchParams()
    if (includeInferred) params.set('include_inferred', 'true')
    if (refresh) params.set('refresh', 'true')
    const qs = params.toString() ? `?${params.toString()}` : ''
    return fetchJson(`/catalogs/${catalog}/schemas/${schema}/relationships${qs}`)
  },

  exportDDL(catalog: string, schemaName: string, tables: string[]): Promise<{ ddl: string }> {
    return fetchJson('/export/ddl', {
      method: 'POST',
      body: JSON.stringify({ catalog, schema_name: schemaName, tables }),
    })
  },

  getHealth(): Promise<Record<string, unknown>> {
    return fetchJson('/health')
  },

  getConfig(): Promise<Record<string, unknown>> {
    return fetchJson('/config')
  },

  getMe(): Promise<{ email: string; name: string; authenticated: boolean }> {
    return fetchJson('/me')
  },

  compareTables(
    leftCatalog: string,
    leftSchema: string,
    leftTable: string,
    rightCatalog: string,
    rightSchema: string,
    rightTable: string,
  ): Promise<TableComparisonResult> {
    return fetchJson('/compare', {
      method: 'POST',
      body: JSON.stringify({
        left_catalog: leftCatalog,
        left_schema: leftSchema,
        left_table: leftTable,
        right_catalog: rightCatalog,
        right_schema: rightSchema,
        right_table: rightTable,
      }),
    })
  },

  compareSchemas(
    leftCatalog: string,
    leftSchema: string,
    rightCatalog: string,
    rightSchema: string,
  ): Promise<SchemaComparisonResult> {
    return fetchJson('/compare/schemas', {
      method: 'POST',
      body: JSON.stringify({
        left_catalog: leftCatalog,
        left_schema: leftSchema,
        right_catalog: rightCatalog,
        right_schema: rightSchema,
      }),
    })
  },

  getColumnLineage(catalog: string, schema: string, refresh = false): Promise<ColumnLineage[]> {
    const qs = refresh ? '?refresh=true' : ''
    return fetchJson(`/catalogs/${catalog}/schemas/${schema}/lineage${qs}`)
  },

  getTableLineage(catalog: string, schema: string, table: string): Promise<TableLineageResult> {
    return fetchJson(`/catalogs/${catalog}/schemas/${schema}/tables/${table}/lineage`)
  },
}

export interface TableLineageResult {
  table_full_name: string
  upstream: ColumnLineage[]
  downstream: ColumnLineage[]
  upstream_tables: string[]
  downstream_tables: string[]
}
