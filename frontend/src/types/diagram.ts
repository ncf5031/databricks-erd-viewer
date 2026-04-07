import type { Node, Edge } from 'reactflow'
import type { TableDetail } from './table'

export type LayoutDirection = 'TB' | 'LR' | 'FORCE'
export type ColumnDisplayMode = 'all' | 'keys' | 'none'

export interface TableNodeData {
  table: TableDetail
  highlighted: boolean
  columnDisplayMode: ColumnDisplayMode
}

export type TableNode = Node<TableNodeData>
export type RelationshipEdge = Edge
