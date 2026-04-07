/**
 * ERD Viewer - ELK.js Layout Engine
 *
 * Computes automatic layout for ERD diagrams using the ELK (Eclipse Layout Kernel).
 * Supports: hierarchical TB, hierarchical LR, and force-directed layouts.
 */

import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'
import type { LayoutDirection } from '@/types/diagram'
import { NODE_WIDTH, NODE_HEADER_HEIGHT, NODE_FOOTER_HEIGHT, NODE_COLUMN_HEIGHT } from '@/utils/constants'

const elk = new ELK()

function estimateNodeHeight(node: Node): number {
  const columnCount = node.data?.table?.columns?.length || 0
  return NODE_HEADER_HEIGHT + (columnCount * NODE_COLUMN_HEIGHT) + NODE_FOOTER_HEIGHT
}

export async function computeLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'TB',
): Promise<Node[]> {
  if (nodes.length === 0) return nodes

  const layoutOptions = getLayoutOptions(direction)

  const graph = {
    id: 'root',
    layoutOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: estimateNodeHeight(node),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  const layout = await elk.layout(graph)

  return nodes.map((node) => {
    const layoutNode = layout.children?.find((n) => n.id === node.id)
    if (layoutNode) {
      return {
        ...node,
        position: {
          x: layoutNode.x || 0,
          y: layoutNode.y || 0,
        },
      }
    }
    return node
  })
}

function getLayoutOptions(direction: LayoutDirection): Record<string, string> {
  switch (direction) {
    case 'TB':
      return {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '60',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
        'elk.padding': '[top=40,left=40,bottom=40,right=40]',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.edgeRouting': 'ORTHOGONAL',
      }
    case 'LR':
      return {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '60',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.padding': '[top=40,left=40,bottom=40,right=40]',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.edgeRouting': 'ORTHOGONAL',
      }
    case 'FORCE':
      return {
        'elk.algorithm': 'force',
        'elk.spacing.nodeNode': '100',
        'elk.force.temperature': '0.001',
        'elk.force.iterations': '300',
        'elk.padding': '[top=40,left=40,bottom=40,right=40]',
      }
    default:
      return {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '60',
      }
  }
}
