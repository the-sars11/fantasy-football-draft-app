import { Suspense } from 'react'
import { LiveDraftClient } from './client'
import { Loader2 } from 'lucide-react'

export default function LiveDraftPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading draft session...
      </div>
    }>
      <LiveDraftClient />
    </Suspense>
  )
}
