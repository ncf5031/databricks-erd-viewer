/**
 * ERD Viewer - Main ERD Canvas
 *
 * React Flow wrapper that renders the interactive ERD diagram.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
} from 'reactflow'
import { TableNode } from './TableNode'
import { RelationshipEdge } from './RelationshipEdge'
import { useDiagramStore } from '@/stores/diagramStore'
import { useCatalogStore } from '@/stores/catalogStore'
import { useUIStore } from '@/stores/uiStore'
import { computeLayout } from '@/layouts/elkLayout'
import { api } from '@/api/client'
import { AlertTriangle, X } from 'lucide-react'

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
}

const edgeTypes: EdgeTypes = {
  relationshipEdge: RelationshipEdge,
}

export function ERDCanvas() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    showInferred,
    layoutDirection,
    buildDiagram,
  } = useDiagramStore()

  const {
    selectedCatalog,
    selectedSchema,
    selectedTables,
    tables,
  } = useCatalogStore()

  const openDetailPanel = useUIStore((s) => s.openDetailPanel)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null)

  // Sync diagram store nodes/edges to React Flow state
  useEffect(() => {
    setNodes(storeNodes)
    setEdges(storeEdges)
  }, [storeNodes, storeEdges, setNodes, setEdges])

  // Build diagram when selected tables change
  useEffect(() => {
    if (!selectedCatalog || !selectedSchema || selectedTables.length === 0) {
      buildDiagram([], [])
      return
    }

    const selectedTableDetails = tables.filter((t) => selectedTables.includes(t.name))

    // Fetch relationships
    setPermissionWarning(null)
    api
      .getRelationships(selectedCatalog, selectedSchema, showInferred)
      .then((relationships) => {
        buildDiagram(selectedTableDetails, relationships)
      })
      .catch((err: Error) => {
        // Show permission warnings, still build diagram without relationships
        if (err.message?.includes('permission') || err.message?.includes('information_schema')) {
          setPermissionWarning(err.message)
        }
        buildDiagram(selectedTableDetails, [])
      })
  }, [selectedCatalog, selectedSchema, selectedTables, tables, showInferred, buildDiagram])

  // Auto-layout when nodes/edges change
  useEffect(() => {
    if (storeNodes.length === 0) return

    computeLayout(storeNodes, storeEdges, layoutDirection).then((layoutNodes) => {
      setStoreNodes(layoutNodes)
    })
    // Only re-layout when table selection or direction changes, not on every node update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTables.length, layoutDirection])

  // Handle node click — open detail panel
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      openDetailPanel(node.id)
    },
    [openDetailPanel],
  )

  // Empty state
  const isEmpty = nodes.length === 0

  // Memoize default edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'relationshipEdge',
    }),
    [],
  )

  return (
    <div className="w-full h-full relative">
      {permissionWarning && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-lg">
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/90 border border-amber-700 rounded-lg text-amber-200 text-xs shadow-lg">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{permissionWarning}</span>
            <button onClick={() => setPermissionWarning(null)} className="ml-1 flex-shrink-0 hover:text-white">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      {isEmpty ? (
        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-30">&#9634;</div>
            <p className="text-lg font-medium">No tables selected</p>
            <p className="text-sm mt-1">
              Select a catalog and schema from the sidebar, then choose tables to visualize.
            </p>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="!bg-white dark:!bg-black"
            color="rgba(100, 116, 139, 0.2)"
          />
          <Controls className="!bg-white dark:!bg-[#222] !border-slate-300 dark:!border-[#333]" />
          <MiniMap
            className="!bg-slate-100 dark:!bg-[#222] !border-slate-300 dark:!border-[#333]"
            nodeColor="#3B82F6"
            maskColor="rgba(0, 0, 0, 0.2)"
          />
        </ReactFlow>
      )}
    </div>
  )
}
