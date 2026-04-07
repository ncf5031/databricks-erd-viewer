/**
 * ERD Viewer - Diagram Store (Zustand)
 *
 * Manages React Flow diagram state: nodes, edges, layout settings.
 */

import { create } from 'zustand'
import type { Node, Edge } from 'reactflow'
import type { LayoutDirection, ColumnDisplayMode, TableNodeData } from '@/types/diagram'
import type { TableDetail } from '@/types/table'
import type { Relationship } from '@/types/relationship'

interface DiagramState {
  // React Flow state
  nodes: Node<TableNodeData>[]
  edges: Edge[]

  // Display settings
  showInferred: boolean
  layoutDirection: LayoutDirection
  columnDisplayMode: ColumnDisplayMode
  highlightedTable: string | null
  animatedEdges: boolean

  // Actions
  setNodes: (nodes: Node<TableNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: unknown[]) => void
  setShowInferred: (show: boolean) => void
  setLayoutDirection: (dir: LayoutDirection) => void
  setColumnDisplayMode: (mode: ColumnDisplayMode) => void
  setAnimatedEdges: (animated: boolean) => void
  highlightRelated: (tableId: string | null) => void
  buildDiagram: (tables: TableDetail[], relationships: Relationship[]) => void
  clearDiagram: () => void
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  showInferred: false,
  layoutDirection: 'TB',
  columnDisplayMode: 'all',
  highlightedTable: null,
  animatedEdges: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (_changes) => {
    // React Flow node change handler — will be wired up in ERDCanvas
  },

  setShowInferred: (show) => set({ showInferred: show }),

  setLayoutDirection: (dir) => set({ layoutDirection: dir }),

  setColumnDisplayMode: (mode) => set({ columnDisplayMode: mode }),

  setAnimatedEdges: (animated) => {
    const { edges } = get()
    const updatedEdges = edges.map((e) => ({ ...e, animated }))
    set({ animatedEdges: animated, edges: updatedEdges })
  },

  highlightRelated: (tableId) => {
    set({ highlightedTable: tableId })

    // Update node highlights
    const { nodes } = get()
    const updatedNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        highlighted: tableId === null ? false : node.id === tableId,
      },
    }))
    set({ nodes: updatedNodes })
  },

  buildDiagram: (tables, relationships) => {
    const { showInferred, columnDisplayMode, animatedEdges } = get()

    // Build nodes from tables
    const nodes: Node<TableNodeData>[] = tables.map((table, index) => ({
      id: table.name,
      type: 'tableNode',
      position: { x: (index % 4) * 320, y: Math.floor(index / 4) * 400 },
      data: {
        table,
        highlighted: false,
        columnDisplayMode,
      },
    }))

    // Build edges from relationships
    const filteredRels = showInferred
      ? relationships
      : relationships.filter((r) => r.type === 'explicit')

    const tableNames = new Set(tables.map((t) => t.name))

    const edges: Edge[] = filteredRels
      .filter((rel) => tableNames.has(rel.source_table) && tableNames.has(rel.target_table))
      .map((rel, index) => ({
        id: `edge-${index}-${rel.source_table}-${rel.target_table}`,
        source: rel.source_table,
        target: rel.target_table,
        sourceHandle: `${rel.source_column}-right`,
        targetHandle: `${rel.target_column}-left`,
        type: 'relationshipEdge',
        data: {
          relationship: rel,
        },
        style: {
          stroke: rel.type === 'explicit' ? '#3B82F6' : '#D97706',
          strokeWidth: rel.type === 'explicit' ? 2 : 1.5,
          strokeDasharray: rel.type === 'inferred' ? '5 5' : undefined,
        },
        animated: animatedEdges,
      }))

    set({ nodes, edges })
  },

  clearDiagram: () => {
    set({ nodes: [], edges: [], highlightedTable: null })
  },
}))
