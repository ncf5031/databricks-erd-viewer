/**
 * ERD Viewer - Detail Panel
 *
 * Shows full metadata for a selected table including columns, types, and DDL.
 */

import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useCatalogStore } from '@/stores/catalogStore'
import { api } from '@/api/client'
import { getTypeColor, formatTypeName } from '@/utils/colors'
import { formatDate } from '@/utils/formatters'
import { LineageView } from './LineageView'
import { X, KeyRound, Link, Copy, Check, Code2, Table2, GitBranch } from 'lucide-react'
import type { TableDetail as TableDetailType } from '@/types/table'

export function DetailPanel() {
  const { detailPanelTable, closeDetailPanel } = useUIStore()
  const { selectedCatalog, selectedSchema, tables } = useCatalogStore()

  const [activeTab, setActiveTab] = useState<'columns' | 'lineage'>('columns')
  const [ddl, setDDL] = useState<string | null>(null)
  const [showDDL, setShowDDL] = useState(false)
  const [copied, setCopied] = useState(false)
  const [enrichedTable, setEnrichedTable] = useState<TableDetailType | null>(null)

  const storeTable = tables.find((t) => t.name === detailPanelTable) || null
  // Use enriched data (with owner/created/updated) if available, fall back to store data
  const table = enrichedTable?.name === detailPanelTable ? enrichedTable : storeTable

  // Fetch enriched table detail (owner, created_at, updated_at) on demand
  useEffect(() => {
    if (!selectedCatalog || !selectedSchema || !detailPanelTable) return
    setEnrichedTable(null)
    api
      .getTableDetail(selectedCatalog, selectedSchema, detailPanelTable)
      .then(setEnrichedTable)
      .catch(() => {}) // Fall back to store data on error
  }, [selectedCatalog, selectedSchema, detailPanelTable])

  // Fetch DDL on demand
  useEffect(() => {
    if (showDDL && selectedCatalog && selectedSchema && detailPanelTable && !ddl) {
      api
        .exportDDL(selectedCatalog, selectedSchema, [detailPanelTable])
        .then((res) => setDDL(res.ddl))
        .catch(() => setDDL('-- Failed to load DDL'))
    }
  }, [showDDL, selectedCatalog, selectedSchema, detailPanelTable, ddl])

  // Reset state when table changes
  useEffect(() => {
    setDDL(null)
    setShowDDL(false)
    setActiveTab('columns')
  }, [detailPanelTable])

  const handleCopyDDL = () => {
    if (ddl) {
      navigator.clipboard.writeText(ddl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!table) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Select a table to view details
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Table2 size={16} className="text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate text-slate-800 dark:text-white">
              {table.name}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {table.full_name}
            </p>
          </div>
        </div>
        <button
          onClick={closeDetailPanel}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#2a2940] text-slate-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#333]">
        <button
          onClick={() => setActiveTab('columns')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'columns'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Columns
        </button>
        <button
          onClick={() => setActiveTab('lineage')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'lineage'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <GitBranch size={14} />
          Lineage
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'lineage' ? (
          <div className="px-4 py-3">
            <LineageView tableName={table.name} />
          </div>
        ) : (
        <>
        {/* Metadata */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2a2940]">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MetaItem label="Type" value={table.table_type} />
            <MetaItem label="Owner" value={table.owner || '—'} />
            <MetaItem label="Created" value={table.created_at ? formatDate(table.created_at) : '—'} />
            <MetaItem label="Updated" value={table.updated_at ? formatDate(table.updated_at) : '—'} />
            <MetaItem label="Columns" value={String(table.columns.length)} />
            <MetaItem label="Partitions" value={table.partition_columns.length > 0 ? table.partition_columns.join(', ') : 'None'} />
          </div>
          {table.comment && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 italic">
              {table.comment}
            </p>
          )}
        </div>

        {/* Columns */}
        <div className="px-4 py-3">
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Columns
          </h4>
          <div className="space-y-1">
            {table.columns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-[#2a2940]"
              >
                <span className="w-4 flex-shrink-0 flex justify-center">
                  {col.is_primary_key && (
                    <KeyRound size={11} className="text-amber-500" />
                  )}
                  {col.is_foreign_key && !col.is_primary_key && (
                    <Link size={11} className="text-blue-500" />
                  )}
                </span>
                <span className={`flex-1 truncate ${col.is_primary_key ? 'font-semibold' : ''} text-slate-700 dark:text-slate-200`}>
                  {col.name}
                </span>
                <span className={`text-[10px] font-mono flex-shrink-0 ${getTypeColor(col.type_name)}`}>
                  {formatTypeName(col.type_name)}
                </span>
                {!col.nullable && (
                  <span className="text-[9px] text-red-500 font-medium">NOT NULL</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DDL */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-[#2a2940]">
          <button
            onClick={() => setShowDDL(!showDDL)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
          >
            <Code2 size={12} />
            {showDDL ? 'Hide DDL' : 'Show DDL'}
          </button>

          {showDDL && (
            <div className="mt-2 relative">
              <button
                onClick={handleCopyDDL}
                className="absolute top-2 right-2 p-1 rounded bg-slate-200 dark:bg-[#2a2940] hover:bg-slate-300 dark:hover:bg-[#3A4352]"
                title="Copy DDL"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
              <pre className="text-[10px] font-mono bg-slate-100 dark:bg-[#1e1e1e] p-3 rounded overflow-x-auto text-slate-700 dark:text-slate-300 max-h-64">
                {ddl || 'Loading...'}
              </pre>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400 dark:text-slate-500">{label}:</span>{' '}
      <span className="text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  )
}
