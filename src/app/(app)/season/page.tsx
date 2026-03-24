'use client'

/**
 * In-Season Hub Page
 *
 * Entry point for in-season features:
 * - Start/Sit Advisor
 * - Waiver Wire AI
 * - Trade Analyzer (future)
 * - Weekly Matchups (future)
 */

import { useRouter } from 'next/navigation'
import {
  Play,
  ShoppingCart,
  ArrowLeftRight,
  Calendar,
  Zap,
  ChevronRight,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFISectionHeader,
  FFIAIRecommendation,
} from '@/components/ui/ffi-primitives'

const features = [
  {
    id: 'start-sit',
    title: 'Start/Sit Advisor',
    description: 'Get AI-powered lineup recommendations with expert consensus and confidence scores.',
    icon: Play,
    href: '/season/start-sit',
    available: true,
    color: '#2ff801',
  },
  {
    id: 'waivers',
    title: 'Waiver Wire AI',
    description: 'Find the best pickups with FAAB bid recommendations and roster fit analysis.',
    icon: ShoppingCart,
    href: '/season/waivers',
    available: true,
    color: '#8bacff',
  },
  {
    id: 'trades',
    title: 'Trade Analyzer',
    description: 'Evaluate trades with rest-of-season projections and roster impact.',
    icon: ArrowLeftRight,
    href: '/season/trade',
    available: true,
    color: '#ffa500',
  },
  {
    id: 'matchups',
    title: 'Weekly Matchups',
    description: 'Head-to-head projections and leverage plays for your matchup.',
    icon: Calendar,
    href: '/season/matchups',
    available: true,
    color: '#ff716c',
  },
]

export default function SeasonHubPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01040a] via-[#0a1628] to-[#01040a]">
      {/* Ambient light effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2ff801]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8bacff]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl sm:text-4xl font-black text-[#deedf9] uppercase tracking-tight mb-2">
            In-Season Command
          </h1>
          <p className="text-[#9eadb8] text-sm">
            AI-powered tools for weekly lineup optimization
          </p>
        </div>

        {/* AI recommendation card */}
        <div className="mb-8">
          <FFIAIRecommendation
            variant="strategic"
            title="Week Ready"
            message="Your lineup is set but there are 2 players on bye. Check Start/Sit Advisor for replacement options."
            primaryAction={{
              label: 'Review Lineup',
              onClick: () => router.push('/season/start-sit'),
            }}
            secondaryAction={{
              label: 'Check Waivers',
              onClick: () => router.push('/season/waivers'),
            }}
          />
        </div>

        {/* Feature cards */}
        <div className="grid gap-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.id}
                className={`
                  relative overflow-hidden rounded-xl transition-all
                  ${feature.available
                    ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                    : 'opacity-50 cursor-not-allowed'
                  }
                `}
                onClick={() => feature.available && router.push(feature.href)}
              >
                <div
                  className={`
                    p-5 border rounded-xl backdrop-blur-lg
                    ${feature.available
                      ? 'bg-surface-container-high/50 border-[#8bacff]/20 hover:border-[#8bacff]/40'
                      : 'bg-surface-container/30 border-[#8bacff]/10'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: feature.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline text-lg font-bold text-[#deedf9] uppercase">
                          {feature.title}
                        </h3>
                        {!feature.available && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold text-[#697782] uppercase">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#9eadb8] mt-1">
                        {feature.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    {feature.available && (
                      <ChevronRight className="w-5 h-5 text-[#8bacff]" />
                    )}
                  </div>
                </div>

                {/* Glow effect for available features */}
                {feature.available && (
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${feature.color}10 0%, transparent 70%)`,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Quick stats */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-surface-container-high border border-[#8bacff]/10 text-center">
            <div className="text-2xl font-headline font-bold text-[#2ff801]">--</div>
            <div className="text-[10px] text-[#697782] uppercase mt-1">Projected Pts</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-high border border-[#8bacff]/10 text-center">
            <div className="text-2xl font-headline font-bold text-[#8bacff]">--</div>
            <div className="text-[10px] text-[#697782] uppercase mt-1">Week Rank</div>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-high border border-[#8bacff]/10 text-center">
            <div className="text-2xl font-headline font-bold text-[#9eadb8]">--</div>
            <div className="text-[10px] text-[#697782] uppercase mt-1">FAAB Left</div>
          </div>
        </div>

        {/* Connect prompt */}
        <div className="mt-8 p-6 rounded-xl bg-surface-container border border-[#8bacff]/20 text-center">
          <Zap className="w-8 h-8 text-[#8bacff] mx-auto mb-3" />
          <h3 className="font-headline text-lg font-bold text-[#deedf9] uppercase mb-2">
            Connect Your League
          </h3>
          <p className="text-sm text-[#9eadb8] mb-4">
            Link your Sleeper, ESPN, or Yahoo league to get personalized recommendations.
          </p>
          <FFIButton
            variant="primary"
            onClick={() => router.push('/settings')}
          >
            Connect Platform
          </FFIButton>
        </div>
      </div>
    </div>
  )
}
