import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { DraftSetupClient } from './client'

export default function DraftSetupPage() {
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
        <h1 className="ffi-title-red ffi-display-md">Draft Setup</h1>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          Confirm your league, managers, and connection before going live
        </p>
      </div>
      <DraftSetupClient />
    </div>
  )
}
