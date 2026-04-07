/**
 * ERD Viewer - Custom Table Node
 *
 * Renders a table card in the ERD diagram with:
 * - Header: table name + icon
 * - Column list with PK/FK indicators and type badges
 * - Footer: column count + partition info
 * - Connection handles positioned absolutely per-column for accurate edge anchoring
 */

import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TableNodeData } from '@/types/diagram'
import { useDiagramStore } from '@/stores/diagramStore'
import { getTypeColor, formatTypeName } from '@/utils/colors'
import { pluralize, formatDate } from '@/utils/formatters'
import { NODE_WIDTH } from '@/utils/constants'
import { KeyRound, Link, Table2 } from 'lucide-react'

// Height constants for precise handle positioning
const HEADER_HEIGHT = 52 // px - header area
const COLUMN_ROW_HEIGHT = 24 // px - each column row
const COLUMN_ROW_OFFSET = 12 // px - center of row (half of row height)

function TableNodeComponent({ data, selected }: NodeProps<TableNodeData>) {
  const { table, highlighted } = data
  // Read columnDisplayMode directly from store for instant updates (no diagram rebuild needed)
  const columnDisplayMode = useDiagramStore((s) => s.columnDisplayMode)

  const visibleColumns = useMemo(() =>
    columnDisplayMode === 'none'
      ? []
      : columnDisplayMode === 'keys'
        ? table.columns.filter((c) => c.is_primary_key || c.is_foreign_key)
        : table.columns,
    [table.columns, columnDisplayMode],
  )

  // Build handles with absolute Y positions outside the column map
  // This ensures React Flow calculates edge paths correctly
  const handles = useMemo(() =>
    visibleColumns.map((col, index) => ({
      id: col.name,
      top: HEADER_HEIGHT + (index * COLUMN_ROW_HEIGHT) + COLUMN_ROW_OFFSET,
    })),
    [visibleColumns],
  )

  const borderColor = highlighted || selected
    ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20'
    : 'border-slate-300 dark:border-[#333]'

  return (
    <div
      className={`rounded-lg border-2 ${borderColor} bg-white dark:bg-[#222] overflow-hidden relative`}
      style={{ width: NODE_WIDTH }}
    >
      {/* Absolutely positioned handles for each column */}
      {handles.map(({ id, top }) => (
        <span key={id}>
          <Handle
            type="target"
            position={Position.Left}
            id={`${id}-left`}
            style={{ top, opacity: 0 }}
            isConnectable={false}
          />
          <Handle
            type="source"
            position={Position.Right}
            id={`${id}-right`}
            style={{ top, opacity: 0 }}
            isConnectable={false}
          />
        </span>
      ))}

      {/* Header */}
      <div className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white flex items-center gap-2" style={{ height: HEADER_HEIGHT }}>
        <Table2 size={14} className="flex-shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{table.name}</div>
          <div className="text-[10px] text-blue-200 truncate opacity-80">
            {table.full_name}
          </div>
        </div>
      </div>

      {/* Columns */}
      {visibleColumns.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-[#2a2940]">
          {visibleColumns.map((col) => (
            <div
              key={col.name}
              className="px-3 flex items-center gap-2 text-xs hover:bg-slate-50 dark:hover:bg-[#2a2940] relative group"
              style={{ height: COLUMN_ROW_HEIGHT }}
            >
              {/* PK/FK indicator */}
              <span className="w-4 flex-shrink-0 flex justify-center">
                {col.is_primary_key && (
                  <KeyRound size={12} className="text-amber-500 dark:text-amber-400" />
                )}
                {col.is_foreign_key && !col.is_primary_key && (
                  <Link size={12} className="text-blue-500 dark:text-blue-400" />
                )}
              </span>

              {/* Column name */}
              <span
                className={`flex-1 truncate ${
                  col.is_primary_key
                    ? 'font-semibold text-slate-800 dark:text-slate-100'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {col.name}
              </span>

              {/* Type badge */}
              <span className={`flex-shrink-0 text-[10px] font-mono ${getTypeColor(col.type_name)}`}>
                {formatTypeName(col.type_name)}
              </span>

              {/* Tooltip on hover */}
              {col.comment && (
                <div className="absolute left-full ml-2 top-0 z-50 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs whitespace-normal">
                  {col.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Collapsed indicator */}
      {columnDisplayMode === 'none' && (
        <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 text-center">
          {pluralize(table.columns.length, 'column')}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#1e1e1e] text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
        <span>
          {pluralize(table.columns.length, 'column')}
          {table.partition_columns.length > 0 &&
            ` \u00b7 ${pluralize(table.partition_columns.length, 'partition')}`}
        </span>
        {table.updated_at && <span>{formatDate(table.updated_at)}</span>}
      </div>
    </div>
  )
}

export const TableNode = memo(TableNodeComponent)
