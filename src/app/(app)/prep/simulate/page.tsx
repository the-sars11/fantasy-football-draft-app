import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SimulateClient } from './client'

export default function SimulatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/prep/strategies"
          className="inline-flex items-center gap-1 ffi-caption text-[var(--ffi-text-secondary)] hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          Strategies
        </Link>
        <h1 className="text-2xl font-bold">Dry Run Simulation</h1>
        <p className="text-muted-foreground">
          Simulate a full draft using your active strategy against historical ADP
        </p>
      </div>
      <SimulateClient />
    </div>
  )
}
