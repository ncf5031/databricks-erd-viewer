/**
 * ERD Viewer - Loading State Components
 *
 * Skeleton loaders for sidebar, canvas, and detail panel.
 */

export function SidebarSkeleton() {
  return (
    <div className="p-3 space-y-3 animate-pulse">
      <div className="h-5 w-32 bg-slate-200 dark:bg-[#333] rounded" />
      <div className="space-y-2 pl-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-slate-200 dark:bg-[#333] rounded" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
      <div className="space-y-2 pl-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-3.5 bg-slate-100 dark:bg-[#2a2940] rounded" style={{ width: `${50 + i * 8}%` }} />
        ))}
      </div>
    </div>
  )
}

export function CanvasLoadingSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center animate-pulse">
        <div className="inline-flex gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-48 h-32 bg-slate-100 dark:bg-[#222] border border-slate-200 dark:border-[#333] rounded-lg"
            />
          ))}
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading diagram...</p>
      </div>
    </div>
  )
}

export function DetailPanelSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-5 w-40 bg-slate-200 dark:bg-[#333] rounded" />
      <div className="h-3 w-56 bg-slate-100 dark:bg-[#2a2940] rounded" />
      <div className="grid grid-cols-2 gap-2 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-slate-100 dark:bg-[#2a2940] rounded" />
        ))}
      </div>
      <div className="space-y-2 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-4 bg-slate-50 dark:bg-[#222] rounded" style={{ width: `${70 + i * 4}%` }} />
        ))}
      </div>
    </div>
  )
}
