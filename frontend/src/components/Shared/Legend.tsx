/**
 * ERD Viewer - Diagram Legend
 *
 * Shows visual key for relationship types and column indicators.
 */

import { KeyRound, Link } from 'lucide-react'
import { useDiagramStore } from '@/stores/diagramStore'

export function Legend() {
  const showInferred = useDiagramStore((s) => s.showInferred)

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-[#222]/90 backdrop-blur-sm border border-slate-200 dark:border-[#333] rounded-lg px-3 py-2 text-[10px] space-y-1.5 shadow-sm">
      <div className="font-semibold text-xs text-slate-600 dark:text-slate-300 mb-1">Legend</div>

      {/* Column indicators */}
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <KeyRound size={10} className="text-amber-500" />
        <span>Primary Key</span>
      </div>
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <Link size={10} className="text-blue-500" />
        <span>Foreign Key</span>
      </div>

      {/* Edge types */}
      <div className="border-t border-slate-200 dark:border-[#333] pt-1.5 mt-1.5">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="#3B82F6" strokeWidth="2" />
          </svg>
          <span>Explicit FK</span>
        </div>
        {showInferred && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mt-1">
            <svg width="24" height="8">
              <line x1="0" y1="4" x2="24" y2="4" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            <span>Inferred FK</span>
          </div>
        )}
      </div>
    </div>
  )
}
