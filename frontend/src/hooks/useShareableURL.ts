/**
 * ERD Viewer - Shareable URL State
 *
 * Encodes/decodes diagram state in URL search params so users can
 * share links that restore the same catalog, schema, and table selection.
 *
 * URL format: ?catalog=X&schema=Y&tables=a,b,c&inferred=true
 */

import { useEffect } from 'react'
import { useCatalogStore } from '@/stores/catalogStore'
import { useDiagramStore } from '@/stores/diagramStore'

export function useShareableURL() {
  // On mount, restore state from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const catalog = params.get('catalog')
    const schema = params.get('schema')
    const tables = params.get('tables')
    const inferred = params.get('inferred')

    if (!catalog) return

    const store = useCatalogStore.getState()
    store.selectCatalog(catalog)

    if (schema) {
      setTimeout(() => {
        useCatalogStore.getState().selectSchema(schema)

        if (tables) {
          const tableList = tables.split(',').filter(Boolean)
          setTimeout(() => {
            useCatalogStore.setState({ selectedTables: tableList })
          }, 1500)
        }
      }, 500)
    }

    if (inferred === 'true') {
      useDiagramStore.getState().setShowInferred(true)
    }
  }, [])

  // Update URL when selections change
  useEffect(() => {
    const unsub = useCatalogStore.subscribe((state) => {
      const params = new URLSearchParams()

      if (state.selectedCatalog) params.set('catalog', state.selectedCatalog)
      if (state.selectedSchema) params.set('schema', state.selectedSchema)
      if (state.selectedTables.length > 0) params.set('tables', state.selectedTables.join(','))
      if (useDiagramStore.getState().showInferred) params.set('inferred', 'true')

      const qs = params.toString()
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      window.history.replaceState(null, '', newUrl)
    })

    return unsub
  }, [])
}
