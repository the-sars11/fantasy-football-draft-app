import { StrategiesPageClient } from './client'

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft Strategies</h1>
        <p className="text-muted-foreground">
          AI-generated strategies tailored to your league settings
        </p>
      </div>
      <StrategiesPageClient />
    </div>
  )
}
