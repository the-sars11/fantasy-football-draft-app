import { RunHistoryClient } from './client'

export default function RunHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="ffi-display-md text-white">Run History</h2>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          View, load, and compare saved research runs
        </p>
      </div>
      <RunHistoryClient />
    </div>
  )
}
