import { ReviewClient } from './client'
import { PageSkeleton } from '@/components/page-skeleton'
import { Suspense } from 'react'

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post-Draft Review</h1>
        <p className="text-muted-foreground">
          Grade your draft and compare to your pre-draft strategy
        </p>
      </div>
      <Suspense fallback={<PageSkeleton cards={3} />}>
        <ReviewClient />
      </Suspense>
    </div>
  )
}
