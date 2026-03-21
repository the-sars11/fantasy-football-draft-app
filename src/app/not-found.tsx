import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-3">
        <FileQuestion className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
      </div>
      <Link
        href="/prep"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Back to Draft Prep
      </Link>
    </div>
  )
}
