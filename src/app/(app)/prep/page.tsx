'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Settings2,
  Sparkles,
  ClipboardList,
  BarChart3,
  History,
  Brain,
  ChevronRight,
  Target,
} from 'lucide-react'
import { DataFreshness } from '@/components/prep/data-freshness'
import {
  FFICard,
  FFIButton,
  FFIAIRecommendation,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'

interface HubCardProps {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
}

function HubCard({ href, icon, title, subtitle }: HubCardProps) {
  return (
    <Link href={href} className="block group">
      <FFICard variant="interactive" className="h-full">
        <div className="flex items-center gap-4">
          {/* Large icon container like mockup */}
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-700 transition-colors">
            <div className="text-[var(--ffi-accent)]">
              {icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-100 group-hover:text-[var(--ffi-accent)] transition-colors">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              {subtitle}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-[var(--ffi-accent)] group-hover:translate-x-1 transition-all shrink-0" />
        </div>
      </FFICard>
    </Link>
  )
}

export default function PrepPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <FFISectionHeader
        title="Prep Hub"
        subtitle="Research, strategize, and build your draft board"
      />

      {/* Data freshness indicator */}
      <DataFreshness />

      {/* AI Recommendation Card */}
      <FFIAIRecommendation
        variant="strategic"
        title="Optimize Your Edge"
        message="Your current league configuration shows high volatility in WR depth. Consider running research on Tier 3 breakouts before your draft."
        primaryAction={{
          label: 'Run Research',
          onClick: () => router.push('/prep/board'),
        }}
        secondaryAction={{
          label: 'View Strategies',
          onClick: () => router.push('/prep/strategies'),
        }}
      />

      {/* Hub Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <HubCard
          href="/prep/configure"
          icon={<Settings2 className="h-5 w-5" />}
          title="Configure League"
          subtitle="Set up your league settings, roster, and scoring"
        />

        <HubCard
          href="/prep/strategies"
          icon={<Sparkles className="h-5 w-5" />}
          title="Draft Strategies"
          subtitle="AI-generated strategies tailored to your league"
        />

        <HubCard
          href="/prep/board"
          icon={<BarChart3 className="h-5 w-5" />}
          title="Draft Board"
          subtitle="Your ranked, tiered, and valued player board"
        />

        <HubCard
          href="/prep/players"
          icon={<Target className="h-5 w-5" />}
          title="Player Browser"
          subtitle="Browse players, intel tags, and set your targets"
        />

        <HubCard
          href="/prep/runs"
          icon={<History className="h-5 w-5" />}
          title="Run History"
          subtitle="Compare saved research runs side by side"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/prep/board">
          <FFIButton variant="secondary" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Run Research
          </FFIButton>
        </Link>
        <Link href="/draft">
          <FFIButton variant="ghost" className="gap-2">
            <Brain className="h-4 w-4" />
            Start Draft
          </FFIButton>
        </Link>
      </div>
    </div>
  )
}
