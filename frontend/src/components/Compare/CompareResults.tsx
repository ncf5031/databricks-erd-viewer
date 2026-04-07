/**
 * ERD Viewer - Comparison Results View
 *
 * Side-by-side diff of two tables with color-coded changes:
 * - Green: Added columns (in right only)
 * - Red: Removed columns (in left only)
 * - Amber: Modified columns (type/nullability/comment changed)
 * - Default: Unchanged columns
 */

import type { TableComparisonResult, ColumnDiff, DiffStatus } from '@/types/comparison'
import { Plus, Minus, PenLine, Equal } from 'lucide-react'

export const STATUS_STYLES: Record<DiffStatus, { bg: string; text: string; icon: typeof Plus; label: string }> = {
  added: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    icon: Plus,
    label: 'Added',
  },
  removed: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    icon: Minus,
    label: 'Removed',
  },
  modified: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    icon: PenLine,
    label: 'Modified',
  },
  unchanged: {
    bg: '',
    text: 'text-slate-500 dark:text-slate-400',
    icon: Equal,
    label: 'Unchanged',
  },
}

export function CompareResults({ result }: { result: TableComparisonResult }) {
  const { column_diffs, partition_diff, summary, left_full_name, right_full_name } = result

  const hasDifferences = summary.added + summary.removed + summary.modified > 0

  return (
    <div className="px-5 py-4 space-y-4">
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

      {/* Column diff table */}
      <div className="border border-slate-200 dark:border-[#333] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr] bg-slate-100 dark:bg-[#222] text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          <div className="px-2 py-2"></div>
          <div className="px-3 py-2">Column</div>
          <div className="px-3 py-2">{left_full_name.split('.').pop()} (Left)</div>
          <div className="px-3 py-2">{right_full_name.split('.').pop()} (Right)</div>
          <div className="px-3 py-2">Nullable</div>
          <div className="px-3 py-2">Changes</div>
        </div>

        {/* Rows */}
        {column_diffs.map((diff) => (
          <DiffRow key={diff.column_name} diff={diff} />
        ))}
      </div>

      {/* Partition diff */}
      {(partition_diff.left_only.length > 0 || partition_diff.right_only.length > 0) && (
        <div className="border border-slate-200 dark:border-[#333] rounded-lg p-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Partition Differences
          </div>
          {partition_diff.left_only.length > 0 && (
            <div className="text-xs text-red-600 dark:text-red-400">
              Left only: {partition_diff.left_only.join(', ')}
            </div>
          )}
          {partition_diff.right_only.length > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400">
              Right only: {partition_diff.right_only.join(', ')}
            </div>
          )}
          {partition_diff.both.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Shared: {partition_diff.both.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DiffRow({ diff }: { diff: ColumnDiff }) {
  const style = STATUS_STYLES[diff.status]
  const Icon = style.icon

  return (
    <div
      className={`grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr] text-xs border-t border-slate-100 dark:border-[#2a2940] ${style.bg}`}
    >
      {/* Status icon */}
      <div className="px-2 py-2 flex items-center justify-center">
        <Icon size={12} className={style.text} />
      </div>

      {/* Column name */}
      <div className={`px-3 py-2 font-medium ${diff.status !== 'unchanged' ? style.text : 'text-slate-700 dark:text-slate-200'}`}>
        {diff.column_name}
      </div>

      {/* Left type */}
      <div className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {diff.left_type || '—'}
      </div>

      {/* Right type */}
      <div className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {diff.right_type || '—'}
      </div>

      {/* Nullable */}
      <div className="px-3 py-2 text-slate-500 dark:text-slate-400">
        {diff.left_nullable != null && diff.right_nullable != null ? (
          diff.left_nullable === diff.right_nullable ? (
            diff.left_nullable ? 'Yes' : 'No'
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              {diff.left_nullable ? 'Yes' : 'No'} → {diff.right_nullable ? 'Yes' : 'No'}
            </span>
          )
        ) : (
          diff.left_nullable != null ? (diff.left_nullable ? 'Yes' : 'No') :
          diff.right_nullable != null ? (diff.right_nullable ? 'Yes' : 'No') : '—'
        )}
      </div>

      {/* Changes */}
      <div className="px-3 py-2">
        {diff.changes.length > 0 ? (
          <div className="space-y-0.5">
            {diff.changes.map((change, i) => (
              <div key={i} className={`text-[10px] ${style.text}`}>
                {change}
              </div>
            ))}
          </div>
        ) : diff.status === 'added' ? (
          <span className="text-[10px] text-green-600 dark:text-green-400">new column</span>
        ) : diff.status === 'removed' ? (
          <span className="text-[10px] text-red-600 dark:text-red-400">removed</span>
        ) : null}
      </div>
    </div>
  )
}

export function SummaryBadge({ status, count }: { status: DiffStatus; count: number }) {
  const style = STATUS_STYLES[status]
  const Icon = style.icon

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg || 'bg-slate-100 dark:bg-[#222]'} ${style.text}`}
    >
      <Icon size={12} />
      {count} {style.label.toLowerCase()}
    </div>
  )
}
