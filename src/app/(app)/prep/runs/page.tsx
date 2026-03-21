import { RunHistoryClient } from './client'

export default function RunHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Run History</h1>
        <p className="text-muted-foreground">
          View, load, and compare saved research runs
        </p>
      </div>
      <RunHistoryClient />
    </div>
  )
}
