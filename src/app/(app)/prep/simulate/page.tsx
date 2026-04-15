import { SimulateClient } from './client'

export default function SimulatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dry Run Simulation</h1>
        <p className="text-muted-foreground">
          Simulate a full draft using your active strategy against historical ADP
        </p>
      </div>
      <SimulateClient />
    </div>
  )
}
