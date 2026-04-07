/**
 * ERD Viewer - Schema Comparison Results
 *
 * Shows table-level diff between two schemas with expandable column details:
 * - Summary badges (tables added/removed/modified/unchanged)
 * - Sortable table list with status indicators
 * - Click to expand matched tables → column-level diff
 */

import { useState } from 'react'
import type { SchemaComparisonResult, TableDiffSummary, DiffStatus } from '@/types/comparison'
import { Plus, Minus, PenLine, Equal, ChevronRight, ChevronDown } from 'lucide-react'
import { SummaryBadge, DiffRow, STATUS_STYLES } from './CompareResults'

export function SchemaCompareResults({ result }: { result: SchemaComparisonResult }) {
  const { table_diffs, table_details, summary, left_full_name, right_full_name } = result
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const hasDifferences = summary.added + summary.removed + summary.modified > 0

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">{left_full_name}</span>
          {' → '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{right_full_name}</span>
        </div>
        <div className="text-xs text-slate-400">
          {table_diffs.length} table{table_diffs.length !== 1 ? 's' : ''} compared
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <SummaryBadge status="added" count={summary.added} />
        <SummaryBadge status="removed" count={summary.removed} />
        <SummaryBadge status="modified" count={summary.modified} />
        <SummaryBadge status="unchanged" count={summary.unchanged} />

        {!hasDifferences && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-2">
            Schemas are identical
          </span>
        )}
      </div>

      {/* Table list */}
      <div className="border border-slate-200 dark:border-[#333] rounded-lg overflow-hidden">
        {table_diffs.map((tableDiff) => (
          <TableDiffRow
            key={tableDiff.table_name}
            tableDiff={tableDiff}
            detail={table_details[tableDiff.table_name]}
            expanded={expandedTables.has(tableDiff.table_name)}
            onToggle={() => toggleTable(tableDiff.table_name)}
          />
        ))}
      </div>
    </div>
  )
}

const TABLE_STATUS_CONFIG: Record<DiffStatus, { icon: typeof Plus; label: string }> = {
  added: { icon: Plus, label: 'New table (right only)' },
  removed: { icon: Minus, label: 'Removed table (left only)' },
  modified: { icon: PenLine, label: 'Columns differ' },
  unchanged: { icon: Equal, label: 'Identical' },
}

function TableDiffRow({
  tableDiff,
  detail,
  expanded,
  onToggle,
}: {
  tableDiff: TableDiffSummary
  detail?: { column_diffs: { column_name: string; status: DiffStatus; left_type: string | null; left_nullable: boolean | null; left_comment: string | null; right_type: string | null; right_nullable: boolean | null; right_comment: string | null; changes: string[] }[]; left_full_name: string; right_full_name: string }
  expanded: boolean
  onToggle: () => void
}) {
  const style = STATUS_STYLES[tableDiff.status]
  const config = TABLE_STATUS_CONFIG[tableDiff.status]
  const Icon = config.icon
  const canExpand = tableDiff.status === 'modified' || tableDiff.status === 'unchanged'

  return (
    <div className="border-t first:border-t-0 border-slate-100 dark:border-[#2a2940]">
      {/* Table row */}
      <div
        onClick={canExpand ? onToggle : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 ${style.bg} ${
          canExpand ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a1a2e]' : ''
        }`}
      >
        {/* Expand chevron */}
        <div className="w-4 flex-shrink-0">
          {canExpand && (
            expanded
              ? <ChevronDown size={14} className="text-slate-400" />
              : <ChevronRight size={14} className="text-slate-400" />
          )}
        </div>

        {/* Status icon */}
        <Icon size={14} className={style.text} />

        {/* Table name */}
        <span className={`text-sm font-medium flex-1 ${
          tableDiff.status !== 'unchanged' ? style.text : 'text-slate-700 dark:text-slate-200'
        }`}>
          {tableDiff.table_name}
        </span>

        {/* Column summary chips */}
        {tableDiff.column_summary && tableDiff.status === 'modified' && (
          <div className="flex items-center gap-2">
            {tableDiff.column_summary.added > 0 && (
              <MiniChip status="added" count={tableDiff.column_summary.added} label="col" />
            )}
            {tableDiff.column_summary.removed > 0 && (
              <MiniChip status="removed" count={tableDiff.column_summary.removed} label="col" />
            )}
            {tableDiff.column_summary.modified > 0 && (
              <MiniChip status="modified" count={tableDiff.column_summary.modified} label="col" />
            )}
          </div>
        )}

        {/* Status label */}
        <span className={`text-[10px] ${style.text} opacity-70`}>
          {config.label}
        </span>
      </div>

      {/* Expanded column detail */}
      {expanded && detail && (
        <div className="bg-slate-50/50 dark:bg-[#0a0a15] border-t border-slate-100 dark:border-[#2a2940]">
          {/* Column diff header */}
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr] bg-slate-100 dark:bg-[#1a1a2e] text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
            <div className="px-2 py-1.5"></div>
            <div className="px-3 py-1.5">Column</div>
            <div className="px-3 py-1.5">{detail.left_full_name.split('.').pop()} (Left)</div>
            <div className="px-3 py-1.5">{detail.right_full_name.split('.').pop()} (Right)</div>
            <div className="px-3 py-1.5">Nullable</div>
            <div className="px-3 py-1.5">Changes</div>
          </div>
          {detail.column_diffs.map((diff) => (
            <DiffRow key={diff.column_name} diff={diff} />
          ))}
        </div>
      )}
    </div>
  )
}

function MiniChip({ status, count, label }: { status: DiffStatus; count: number; label: string }) {
  const style = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg || 'bg-slate-100 dark:bg-[#222]'} ${style.text}`}>
      {count} {label}
    </span>
  )
}
