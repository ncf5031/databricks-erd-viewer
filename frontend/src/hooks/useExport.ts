/**
 * ERD Viewer - Export Hook
 *
 * Provides export functionality for:
 * - PNG: Raster image of the current canvas
 * - SVG: Vector image of the current canvas
 * - DDL: CREATE TABLE statements from the backend
 * - JSON: Diagram state (nodes, edges, positions)
 */

import { useCallback } from 'react'
import { toPng, toSvg } from 'html-to-image'
import { useCatalogStore } from '@/stores/catalogStore'
import { useDiagramStore } from '@/stores/diagramStore'
import { api } from '@/api/client'

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

function getFilenameBase(): string {
  const { selectedCatalog, selectedSchema } = useCatalogStore.getState()
  const cat = selectedCatalog || 'catalog'
  const sch = selectedSchema || 'schema'
  return `${cat}_${sch}_erd_${getTimestamp()}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}

function getCanvasElement(): HTMLElement | null {
  return document.querySelector('.react-flow__viewport') as HTMLElement | null
}

export function useExport() {
  const exportPNG = useCallback(async () => {
    const el = getCanvasElement()
    if (!el) return

    try {
      const dataUrl = await toPng(el, {
        backgroundColor: document.documentElement.classList.contains('dark')
          ? '#000000'
          : '#FFFFFF',
        pixelRatio: 2,
      })

      const res = await fetch(dataUrl)
      const blob = await res.blob()
      downloadBlob(blob, `${getFilenameBase()}.png`)
    } catch (err) {
      console.error('PNG export failed:', err)
    }
  }, [])

  const exportSVG = useCallback(async () => {
    const el = getCanvasElement()
    if (!el) return

    try {
      const dataUrl = await toSvg(el, {
        backgroundColor: document.documentElement.classList.contains('dark')
          ? '#000000'
          : '#FFFFFF',
      })

      const res = await fetch(dataUrl)
      const blob = await res.blob()
      downloadBlob(blob, `${getFilenameBase()}.svg`)
    } catch (err) {
      console.error('SVG export failed:', err)
    }
  }, [])

  const exportDDL = useCallback(async () => {
    const { selectedCatalog, selectedSchema, selectedTables } = useCatalogStore.getState()
    if (!selectedCatalog || !selectedSchema || selectedTables.length === 0) return

    try {
      const result = await api.exportDDL(selectedCatalog, selectedSchema, selectedTables)
      downloadText(result.ddl, `${getFilenameBase()}.sql`, 'text/sql')
    } catch (err) {
      console.error('DDL export failed:', err)
    }
  }, [])

  const exportJSON = useCallback(() => {
    const { nodes, edges } = useDiagramStore.getState()
    const { selectedCatalog, selectedSchema, selectedTables } = useCatalogStore.getState()

    const state = {
      catalog: selectedCatalog,
      schema: selectedSchema,
      tables: selectedTables,
      nodes: nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: { tableName: n.data.table.name },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data,
      })),
      exportedAt: new Date().toISOString(),
    }

    downloadText(JSON.stringify(state, null, 2), `${getFilenameBase()}.json`, 'application/json')
  }, [])

  const importJSON = useCallback((jsonString: string) => {
    try {
      const state = JSON.parse(jsonString)
      const { selectCatalog, selectSchema } = useCatalogStore.getState()

      // Restore catalog/schema selection (which triggers data fetch)
      if (state.catalog) {
        selectCatalog(state.catalog)
        if (state.schema) {
          // Delay schema selection to let catalog fetch complete
          setTimeout(() => {
            selectSchema(state.schema)
            if (state.tables && Array.isArray(state.tables)) {
              setTimeout(() => {
                const store = useCatalogStore.getState()
                const validTables = state.tables.filter((t: string) =>
                  store.tables.some((st) => st.name === t),
                )
                useCatalogStore.setState({ selectedTables: validTables })
              }, 1500)
            }
          }, 500)
        }
      }
    } catch (err) {
      console.error('JSON import failed:', err)
    }
  }, [])

  return { exportPNG, exportSVG, exportDDL, exportJSON, importJSON }
}
