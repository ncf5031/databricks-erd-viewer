/**
 * ERD Viewer - Lineage View
 *
 * Visual lineage display in the detail panel:
 * 1. Mini flow diagram: upstream → selected table → downstream
 * 2. Per-column lineage: expandable list of column-level data flow
 */

import { useEffect, useState } from 'react'
import { useCatalogStore } from '@/stores/catalogStore'
import { api, type TableLineageResult, type ColumnLineage } from '@/api/client'
import { ArrowRight, ChevronDown, ChevronRight, Loader2, GitBranch } from 'lucide-react'

interface LineageViewProps {
  tableName: string
}

export function LineageView({ tableName }: LineageViewProps) {
  const { selectedCatalog, selectedSchema } = useCatalogStore()
  const [lineage, setLineage] = useState<TableLineageResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCatalog || !selectedSchema || !tableName) return

    setLoading(true)
    setError(null)
    api
      .getTableLineage(selectedCatalog, selectedSchema, tableName)
      .then(setLineage)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedCatalog, selectedSchema, tableName])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center">
        <Loader2 size={14} className="animate-spin" />
        Loading lineage...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        Lineage unavailable — requires access to system.access.column_lineage
      </div>
    )
  }

  if (!lineage || (lineage.upstream.length === 0 && lineage.downstream.length === 0)) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        No lineage data found for this table (last 7 days)
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mini flow diagram */}
      <FlowDiagram
        tableName={tableName}
        upstreamTables={lineage.upstream_tables}
        downstreamTables={lineage.downstream_tables}
      />

      {/* Per-column lineage */}
      <ColumnLineageList
        upstream={lineage.upstream}
        downstream={lineage.downstream}
      />
    </div>
  )
}

function FlowDiagram({
  tableName,
  upstreamTables,
  downstreamTables,
}: {
  tableName: string
  upstreamTables: string[]
  downstreamTables: string[]
}) {
  return (
    <div className="bg-slate-50 dark:bg-[#1e1e1e] rounded-lg p-3">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1">
        <GitBranch size={12} />
        Data Flow
      </div>

      <div className="flex items-start gap-2">
        {/* Upstream column */}
        <div className="flex-1 min-w-0">
          {upstreamTables.length > 0 ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Upstream</div>
              {upstreamTables.map((t) => (
                <TableBadge key={t} name={t} direction="upstream" />
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic">No upstream</div>
          )}
        </div>

        {/* Arrows + center table */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-4">
          {upstreamTables.length > 0 && <ArrowRight size={14} className="text-green-500" />}
          <div className="px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded truncate max-w-[120px]">
            {tableName}
          </div>
          {downstreamTables.length > 0 && <ArrowRight size={14} className="text-green-500" />}
        </div>

        {/* Downstream column */}
        <div className="flex-1 min-w-0">
          {downstreamTables.length > 0 ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Downstream</div>
              {downstreamTables.map((t) => (
                <TableBadge key={t} name={t} direction="downstream" />
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic">No downstream</div>
          )}
        </div>
      </div>
    </div>
  )
}

function TableBadge({ name, direction }: { name: string; direction: 'upstream' | 'downstream' }) {
  // Show just the table name (last part of fully qualified name)
  const shortName = name.split('.').pop() || name
  const fullName = name

  return (
    <div
      className={`px-2 py-1 rounded text-xs truncate border ${
        direction === 'upstream'
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
          : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
      }`}
      title={fullName}
    >
      {shortName}
    </div>
  )
}

function ColumnLineageList({
  upstream,
  downstream,
}: {
  upstream: ColumnLineage[]
  downstream: ColumnLineage[]
}) {
  // Group by column on THIS table
  const columnMap = new Map<string, { sources: ColumnLineage[]; targets: ColumnLineage[] }>()

  for (const l of upstream) {
    const col = l.target_column
    if (!columnMap.has(col)) columnMap.set(col, { sources: [], targets: [] })
    columnMap.get(col)!.sources.push(l)
  }

  for (const l of downstream) {
    const col = l.source_column
    if (!columnMap.has(col)) columnMap.set(col, { sources: [], targets: [] })
    columnMap.get(col)!.targets.push(l)
  }

  if (columnMap.size === 0) return null

  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        Column Lineage
      </div>
      <div className="space-y-1">
        {[...columnMap.entries()].map(([colName, { sources, targets }]) => (
          <ColumnLineageItem
            key={colName}
            columnName={colName}
            sources={sources}
            targets={targets}
          />
        ))}
      </div>
    </div>
  )
}

function ColumnLineageItem({
  columnName,
  sources,
  targets,
}: {
  columnName: string
  sources: ColumnLineage[]
  targets: ColumnLineage[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-slate-200 dark:border-[#333] rounded">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-[#2a2940]"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-medium text-slate-700 dark:text-slate-200">{columnName}</span>
        <span className="text-slate-400 ml-auto">
          {sources.length > 0 && <span className="text-emerald-500">{sources.length} in</span>}
          {sources.length > 0 && targets.length > 0 && <span className="mx-1">/</span>}
          {targets.length > 0 && <span className="text-sky-500">{targets.length} out</span>}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {sources.map((s, i) => (
            <div key={`s-${i}`} className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <span className="opacity-60">&larr;</span>
              <span>{s.source_table.split('.').pop()}.{s.source_column}</span>
            </div>
          ))}
          {targets.map((t, i) => (
            <div key={`t-${i}`} className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400">
              <span className="opacity-60">&rarr;</span>
              <span>{t.target_table.split('.').pop()}.{t.target_column}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
