/**
 * ERD Viewer - Sidebar / Catalog Tree
 *
 * Browsable tree: Catalogs → Schemas → Tables
 * With search, multi-select, and lazy loading.
 */

import { useMemo } from 'react'
import { useCatalogStore } from '@/stores/catalogStore'
import { useUIStore } from '@/stores/uiStore'
import {
  Database,
  Folder,
  Table2,
  CheckSquare,
  Square,
  RefreshCw,
  ChevronRight,
  Search,
} from 'lucide-react'

export function Sidebar() {
  const {
    catalogs,
    schemas,
    tables,
    selectedCatalog,
    selectedSchema,
    selectedTables,
    loadingCatalogs,
    loadingSchemas,
    loadingTables,
    error,
    selectCatalog,
    selectSchema,
    toggleTableSelection,
    selectAllTables,
    clearTableSelection,
    fetchCatalogs,
  } = useCatalogStore()

  const { searchQuery, setSearchQuery } = useUIStore()

  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables
    const q = searchQuery.toLowerCase()
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.comment && t.comment.toLowerCase().includes(q)),
    )
  }, [tables, searchQuery])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            Unity Catalog
          </h2>
          <button
            onClick={() => fetchCatalogs(true)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#2a2940] text-slate-500 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Search */}
        {selectedSchema && (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Filter tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-[#2a2940] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* Catalog List */}
      <div className="flex-1 overflow-y-auto">
        {loadingCatalogs ? (
          <div className="px-3 py-4 text-xs text-slate-400 animate-pulse">
            Loading catalogs...
          </div>
        ) : catalogs.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-400">
            No catalogs accessible
          </div>
        ) : (
          <div className="py-1">
            {catalogs.map((cat) => (
              <div key={cat.name}>
                {/* Catalog item */}
                <button
                  onClick={() =>
                    selectCatalog(selectedCatalog === cat.name ? null : cat.name)
                  }
                  className={`w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-[#2a2940] ${
                    selectedCatalog === cat.name
                      ? 'bg-slate-100 dark:bg-[#2a2940] font-semibold'
                      : ''
                  }`}
                >
                  <ChevronRight
                    size={12}
                    className={`transition-transform ${
                      selectedCatalog === cat.name ? 'rotate-90' : ''
                    }`}
                  />
                  <Database size={14} className="text-blue-500 flex-shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {cat.name}
                  </span>
                </button>

                {/* Schemas */}
                {selectedCatalog === cat.name && (
                  <div className="pl-6">
                    {loadingSchemas ? (
                      <div className="px-3 py-2 text-xs text-slate-400 animate-pulse">
                        Loading schemas...
                      </div>
                    ) : schemas.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        No schemas
                      </div>
                    ) : (
                      schemas.map((schema) => (
                        <div key={schema.name}>
                          <button
                            onClick={() =>
                              selectSchema(
                                selectedSchema === schema.name ? null : schema.name,
                              )
                            }
                            className={`w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-[#2a2940] ${
                              selectedSchema === schema.name
                                ? 'bg-slate-100 dark:bg-[#2a2940] font-semibold'
                                : ''
                            }`}
                          >
                            <ChevronRight
                              size={12}
                              className={`transition-transform ${
                                selectedSchema === schema.name ? 'rotate-90' : ''
                              }`}
                            />
                            <Folder
                              size={14}
                              className="text-amber-500 flex-shrink-0"
                            />
                            <span className="truncate text-slate-700 dark:text-slate-200">
                              {schema.name}
                            </span>
                          </button>

                          {/* Tables */}
                          {selectedSchema === schema.name && (
                            <div className="pl-6">
                              {/* Select All / Clear */}
                              <div className="px-3 py-1 flex gap-2">
                                <button
                                  onClick={selectAllTables}
                                  className="text-xs text-blue-500 hover:underline"
                                >
                                  Select all
                                </button>
                                <span className="text-slate-300 dark:text-slate-500">
                                  |
                                </span>
                                <button
                                  onClick={clearTableSelection}
                                  className="text-xs text-blue-500 hover:underline"
                                >
                                  Clear
                                </button>
                              </div>

                              {loadingTables ? (
                                <div className="px-3 py-2 text-xs text-slate-400 animate-pulse">
                                  Loading tables...
                                </div>
                              ) : filteredTables.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-slate-400">
                                  {searchQuery ? 'No matches' : 'No tables'}
                                </div>
                              ) : (
                                filteredTables.map((table) => {
                                  const isSelected = selectedTables.includes(
                                    table.name,
                                  )
                                  return (
                                    <button
                                      key={table.name}
                                      onClick={() =>
                                        toggleTableSelection(table.name)
                                      }
                                      className={`w-full px-3 py-1.5 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-[#2a2940] ${
                                        isSelected
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : 'text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {isSelected ? (
                                        <CheckSquare
                                          size={14}
                                          className="text-blue-500 flex-shrink-0"
                                        />
                                      ) : (
                                        <Square
                                          size={14}
                                          className="text-slate-400 flex-shrink-0"
                                        />
                                      )}
                                      <Table2
                                        size={12}
                                        className="text-slate-400 flex-shrink-0"
                                      />
                                      <span className="truncate">
                                        {table.name}
                                      </span>
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: selected count */}
      {selectedTables.length > 0 && (
        <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-300">
          {selectedTables.length} table{selectedTables.length !== 1 ? 's' : ''} on
          canvas
        </div>
      )}
    </div>
  )
}
