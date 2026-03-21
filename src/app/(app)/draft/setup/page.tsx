import { DraftSetupClient } from './client'

export default function DraftSetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft Setup</h1>
        <p className="text-muted-foreground">
          Select a league, add managers, and connect your draft sheet
        </p>
      </div>
      <DraftSetupClient />
    </div>
  )
}
