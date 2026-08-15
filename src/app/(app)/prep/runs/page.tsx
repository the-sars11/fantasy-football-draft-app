import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { RunHistoryClient } from './client'

export default function RunHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 ffi-caption text-[var(--ffi-text-secondary)] hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          Setup
        </Link>
        <h2 className="ffi-title-red ffi-display-md">Run History</h2>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          View, load, and compare saved research runs
        </p>
      </div>
      <RunHistoryClient />
    </div>
  )
}
