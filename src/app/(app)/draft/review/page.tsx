import { ReviewClient } from './client'
import { PageSkeleton } from '@/components/page-skeleton'
import { Suspense } from 'react'

export default function ReviewPage() {
  return (
    <div>
      <div className="mb-4">
        <p className="ffi-caption text-[var(--ffi-ink-3)]">FFI Gridiron</p>
        <h1 className="font-headline font-extrabold text-[22px] leading-none text-[var(--ffi-ink)] mt-0.5">
          Post-Draft Review
        </h1>
      </div>
      <Suspense fallback={<PageSkeleton cards={3} />}>
        <ReviewClient />
      </Suspense>
    </div>
  )
}
