import { ReviewClient } from './client'
import { PageSkeleton } from '@/components/page-skeleton'
import { Suspense } from 'react'

// Header is owned by ReviewClient (reads URL params for context chip).
export default function ReviewPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={3} />}>
      <ReviewClient />
    </Suspense>
  )
}
