import { ReviewClient } from './client'
import { PageSkeleton } from '@/components/page-skeleton'
import { Suspense } from 'react'

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-1 bg-[#8bacff] shadow-[0_0_8px_#8bacff]" />
          <h1 className="font-headline text-2xl font-bold text-[#deedf9] tracking-tight">
            Post-Draft Review
          </h1>
        </div>
        <p className="text-[#9eadb8] font-body text-sm">
          Grade your draft and compare to your pre-draft strategy
        </p>
      </div>
      <Suspense fallback={<PageSkeleton cards={3} />}>
        <ReviewClient />
      </Suspense>
    </div>
  )
}
