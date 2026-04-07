/**
 * ERD Viewer - Custom Relationship Edge
 *
 * Renders FK relationship lines with:
 * - Solid lines for explicit FKs (blue)
 * - Dashed lines for inferred FKs (amber)
 * - Constraint name or "inferred" badge label
 * - Cardinality markers at endpoints
 */

import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'
import type { Relationship } from '@/types/relationship'

interface RelationshipEdgeData {
  relationship: Relationship
}

function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  selected,
}: EdgeProps<RelationshipEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const rel = data?.relationship
  const isInferred = rel?.type === 'inferred'

  const edgeStyle = {
    ...style,
    stroke: selected
      ? '#ffffff'
      : isInferred
        ? 'var(--edge-inferred, #D97706)'
        : 'var(--edge-explicit, #3B82F6)',
    strokeWidth: selected ? 3 : isInferred ? 1.5 : 2,
    strokeDasharray: isInferred ? '5 5' : undefined,
  }

  const label = isInferred
    ? 'inferred'
    : rel?.constraint_name || `${rel?.source_column} → ${rel?.target_column}`

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-all nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              isInferred
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
            }`}
          >
            {label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const RelationshipEdge = memo(RelationshipEdgeComponent)
