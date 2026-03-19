import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, FileSpreadsheet, Trophy } from 'lucide-react'

const btnPrimary = 'inline-flex items-center justify-center rounded-lg bg-primary px-2.5 h-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80'
const btnSecondary = 'inline-flex items-center justify-center rounded-lg bg-secondary px-2.5 h-8 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80'

export default function DraftPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Draft</h1>
        <p className="text-muted-foreground">Real-time draft tracking and AI recommendations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Draft Setup
            </CardTitle>
            <CardDescription>Connect your draft sheet, set managers, and import keepers</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/draft/setup" className={btnPrimary}>Setup Draft</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Live Draft
            </CardTitle>
            <CardDescription>Track picks in real time with AI-powered recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/draft/live" className={btnSecondary}>Go Live</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Post-Draft Review
            </CardTitle>
            <CardDescription>Grade your draft and compare to pre-draft targets</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/draft/review" className={btnSecondary}>Review</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
