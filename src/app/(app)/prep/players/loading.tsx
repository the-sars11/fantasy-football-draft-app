import { Loader2 } from 'lucide-react'

export default function PlayersLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-[#8bacff]" />
      <span className="ml-2 text-[#9eadb8] text-sm">Loading players...</span>
    </div>
  )
}
