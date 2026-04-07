/**
 * ERD Viewer - Schema Comparison Panel
 *
 * Full-screen overlay for comparing two tables across catalogs.
 * Shows:
 * - Catalog/schema/table selectors for left and right sides
 * - Side-by-side column diff with color-coded changes
 * - Summary of differences
 */

import { useComparisonStore } from '@/stores/comparisonStore'
import { useCatalogStore } from '@/stores/catalogStore'
import { X, ArrowLeftRight, Loader2, Table2, Database } from 'lucide-react'
import { CompareResults } from './CompareResults'
import { SchemaCompareResults } from './SchemaCompareResults'

export function ComparePanel() {
  const {
    isOpen,
    close,
    mode, setMode,
    leftCatalog, leftSchema, leftTable,
    leftSchemas, leftTables,
    rightCatalog, rightSchema, rightTable,
    rightSchemas, rightTables,
    setLeftCatalog, setLeftSchema, setLeftTable,
    setRightCatalog, setRightSchema, setRightTable,
    runComparison, runSchemaComparison,
    result, schemaResult, loading, error,
  } = useComparisonStore()

  const catalogs = useCatalogStore((s) => s.catalogs)

  if (!isOpen) return null

  const isSchemaMode = mode === 'schema'
  const canCompare = isSchemaMode
    ? leftCatalog && leftSchema && rightCatalog && rightSchema
    : leftCatalog && leftSchema && leftTable && rightCatalog && rightSchema && rightTable

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-[#111] w-[90vw] max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#333]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#333]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                Schema Comparison
              </h2>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-[#222] rounded-lg p-0.5">
              <button
                onClick={() => setMode('schema')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isSchemaMode
                    ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Database size={13} />
                Schema
              </button>
              <button
                onClick={() => setMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  !isSchemaMode
                    ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Table2 size={13} />
                Table
              </button>
            </div>
          </div>
          <button
            onClick={close}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#222] text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selectors */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-[#2a2940] space-y-3">
          {/* Two-row layout: selectors on top, compare button below */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left side */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2">
                Source (Left)
              </div>
              <div className={`grid ${isSchemaMode ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                <SelectBox
                  placeholder="Catalog"
                  value={leftCatalog}
                  options={catalogs.map((c) => c.name)}
                  onChange={setLeftCatalog}
                />
                <SelectBox
                  placeholder="Schema"
                  value={leftSchema}
                  options={leftSchemas.map((s) => s.name)}
                  onChange={setLeftSchema}
                  disabled={!leftCatalog}
                />
                {!isSchemaMode && (
                  <SelectBox
                    placeholder="Table"
                    value={leftTable}
                    options={leftTables.map((t) => t.name)}
                    onChange={setLeftTable}
                    disabled={!leftSchema}
                  />
                )}
              </div>
            </div>

            {/* Right side */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2">
                Target (Right)
              </div>
              <div className={`grid ${isSchemaMode ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                <SelectBox
                  placeholder="Catalog"
                  value={rightCatalog}
                  options={catalogs.map((c) => c.name)}
                  onChange={setRightCatalog}
                />
                <SelectBox
                  placeholder="Schema"
                  value={rightSchema}
                  options={rightSchemas.map((s) => s.name)}
                  onChange={setRightSchema}
                  disabled={!rightCatalog}
                />
                {!isSchemaMode && (
                  <SelectBox
                    placeholder="Table"
                    value={rightTable}
                    options={rightTables.map((t) => t.name)}
                    onChange={setRightTable}
                    disabled={!rightSchema}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Compare button - centered below */}
          <div className="flex justify-center">
            <button
              onClick={isSchemaMode ? runSchemaComparison : runComparison}
              disabled={!canCompare || loading}
              className="px-6 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowLeftRight size={14} />
              )}
              Compare {isSchemaMode ? 'Schemas' : 'Tables'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
            {error}
          </div>
        )}

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">
          {isSchemaMode && schemaResult ? (
            <SchemaCompareResults result={schemaResult} />
          ) : !isSchemaMode && result ? (
            <CompareResults result={result} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Comparing {isSchemaMode ? 'schemas' : 'tables'}...
                </div>
              ) : (
                <div className="text-center">
                  <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-20" />
                  <p>
                    {isSchemaMode
                      ? 'Select a schema on each side and click Compare Schemas'
                      : 'Select a table on each side and click Compare Tables'}
                  </p>
                  <p className="text-xs mt-1 opacity-60">
                    {isSchemaMode
                      ? 'Compare all tables across schemas to detect drift between environments or medallion layers'
                      : 'Compare individual tables across catalogs to see column-level differences'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SelectBox({
  placeholder,
  value,
  options,
  onChange,
  disabled,
}: {
  placeholder: string
  value: string
  options: string[]
  onChange: (val: string) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex-1 px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-[#333] bg-white dark:bg-[#222] text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
