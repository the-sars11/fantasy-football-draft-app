import { DraftBoardClient } from './client'

export default function DraftBoardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft Board</h1>
        <p className="text-muted-foreground">
          Your ranked, tiered, and strategy-adjusted player board
        </p>
      </div>
      <DraftBoardClient />
    </div>
  )
}
