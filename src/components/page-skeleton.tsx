function FfiSkeleton({ className = '' }: { className?: string }) {
  return <div className={`ffi-skeleton ${className}`} />
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FfiSkeleton className="h-8 w-48" />
        <FfiSkeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.04] bg-[#0a1b25] p-6 space-y-3">
            <FfiSkeleton className="h-5 w-40" />
            <FfiSkeleton className="h-4 w-full" />
            <FfiSkeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <FfiSkeleton className="h-8 w-48" />
        <FfiSkeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        <FfiSkeleton className="h-9 w-[220px]" />
        <FfiSkeleton className="h-9 w-32" />
        <FfiSkeleton className="h-9 flex-1 max-w-xs" />
      </div>
      <div className="rounded-xl border border-white/[0.04] overflow-hidden">
        <div className="bg-[#0a1b25]/80 px-4 py-3 flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <FfiSkeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-t border-white/[0.04] px-4 py-3 flex gap-6">
            {Array.from({ length: 5 }).map((_, j) => (
              <FfiSkeleton key={j} className="h-4 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
