import { DraftSetupClient } from './client'

// Client owns its own header (step-aware title + "Step N of 3" chip).
// page.tsx must not add a static header here -- double-header bug,
// same rule documented in src/app/(app)/draft/page.tsx.
export default function DraftSetupPage() {
  return <DraftSetupClient />
}
