import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, BarChart3, History, Settings2, Sparkles } from 'lucide-react'
import { DataFreshness } from '@/components/prep/data-freshness'

const btnPrimary = 'inline-flex items-center justify-center rounded-lg bg-primary px-2.5 h-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80'
const btnSecondary = 'inline-flex items-center justify-center rounded-lg bg-secondary px-2.5 h-8 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80'

export default function PrepPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft Prep</h1>
        <p className="text-muted-foreground">Research, strategize, and build your draft board</p>
      </div>

      {/* Data freshness indicator */}
      <DataFreshness />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configure League
            </CardTitle>
            <CardDescription>Set up your league settings, roster, and scoring</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prep/configure" className={btnPrimary}>Configure</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Draft Strategies
            </CardTitle>
            <CardDescription>AI-generated strategies tailored to your league</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prep/strategies" className={btnPrimary}>Strategies</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Run Research
            </CardTitle>
            <CardDescription>Pull data, run AI analysis, generate your draft board</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prep/board" className={btnSecondary}>Research</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Draft Board
            </CardTitle>
            <CardDescription>View your ranked, tiered, and valued player board</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prep/board" className={btnSecondary}>View Board</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Run History
            </CardTitle>
            <CardDescription>Compare saved research runs side by side</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prep/runs" className={btnSecondary}>View Runs</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
