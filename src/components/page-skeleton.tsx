import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-24" />
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-[220px]" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 flex-1 max-w-xs" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-t border-border px-4 py-3 flex gap-6">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
