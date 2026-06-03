import { StrategiesPageClient } from './client'

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="ffi-display-md text-white">Draft Strategies</h2>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          AI-generated strategies tailored to your league settings
        </p>
      </div>
      <StrategiesPageClient />
    </div>
  )
}
