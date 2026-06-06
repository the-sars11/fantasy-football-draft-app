'use client'

import Link from 'next/link'
import {
  Settings2,
  BarChart3,
  History,
  Layers,
  Lock,
  Play,
  Zap,
  Target,
  ChevronRight,
} from 'lucide-react'
import { DataFreshness } from '@/components/prep/data-freshness'

function SectLabel({ first, children }: { first?: boolean; children: string }) {
  return (
    <p
      className={`font-bold text-[10px] uppercase mb-2.5 ${first ? 'mt-0' : 'mt-6'}`}
      style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.28em', color: 'var(--ffi-ink-3)' }}
    >
      {children}
    </p>
  )
}

export default function PrepPage() {
  return (
    <div className="pb-2">

      {/* ── SETUP ─────────────────────────────────────────────── */}
      <SectLabel first>Setup</SectLabel>

      <Link href="/prep/configure" className="block ffi-card-interactive">
        <div className="flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(77,130,255,0.10)', border: '1px solid rgba(77,130,255,0.16)' }}
          >
            <Settings2 className="w-5 h-5" strokeWidth={1.7} color="var(--ffi-blue-bright)" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-extrabold text-[18px] leading-tight"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
            >
              Configure League
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ffi-ink-2)' }}>
              Format, roster slots, and scoring rules
            </p>
          </div>
          <ChevronRight
            className="w-[18px] h-[18px] shrink-0 opacity-35"
            color="var(--ffi-ink-2)"
            strokeWidth={2}
          />
        </div>
      </Link>

      {/* ── RESEARCH ──────────────────────────────────────────── */}
      <SectLabel>Research</SectLabel>

      {/* Hero analysis card — .ffi-hero applies gradient + iridescent sheen */}
      <div className="ffi-hero p-4">
        <p
          className="font-bold text-[10px] uppercase"
          style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.26em', color: 'var(--ffi-blue-bright)' }}
        >
          Analysis Engine
        </p>
        <p
          className="font-extrabold text-[26px] leading-[1.05] mt-1"
          style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
        >
          Player Research
        </p>
        <p className="text-[13px] leading-[1.45] mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
          Deep analysis from ESPN, Sleeper, and FantasyPros -- ranked and valued for your exact scoring system.
        </p>

        {/* Stat row */}
        <div className="flex mt-3.5 pt-3" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
          {[
            { k: 'Players', v: '3,048' },
            { k: 'Last Run', v: '--' },
            { k: 'Saved Runs', v: '0' },
          ].map(({ k, v }) => (
            <div key={k} className="flex-1 pr-4 last:pr-0">
              <p
                className="font-bold text-[9px] uppercase"
                style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.22em', color: 'var(--ffi-ink-3)' }}
              >
                {k}
              </p>
              <p
                className="font-bold text-[20px] leading-none mt-0.5 tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink)' }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>

        {/* AI Read */}
        <div
          className="mt-3 rounded-[11px] p-3"
          style={{ background: 'rgba(77,130,255,0.09)', border: '1px solid rgba(77,130,255,0.16)' }}
        >
          <p
            className="font-bold text-[9px] uppercase mb-1"
            style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.26em', color: 'var(--ffi-blue-bright)' }}
          >
            AI Read
          </p>
          <p className="text-[12px] leading-[1.45]" style={{ color: 'var(--ffi-ink-2)' }}>
            WR depth is thinner than ADP suggests in PPR formats. Run research to surface Tier 3 breakout candidates and lock your targets before draft day.
          </p>
        </div>

        {/* Volt CTA */}
        <Link
          href="/prep/board"
          className="ffi-btn-hero w-full mt-3.5 text-[14px] uppercase tracking-widest"
          style={{ borderRadius: '12px' }}
        >
          <Play className="w-[14px] h-[14px]" strokeWidth={2.5} color="var(--ffi-volt-ink)" />
          Start Research
        </Link>
      </div>

      {/* 3-tile row: Board / Strategies / History */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {(
          [
            {
              href: '/prep/board',
              label: 'Draft Board',
              sub: '3,048',
              iconBg: 'rgba(77,130,255,0.10)',
              icon: <BarChart3 className="w-[15px] h-[15px]" strokeWidth={1.8} color="var(--ffi-blue-bright)" />,
            },
            {
              href: '/prep/strategies',
              label: 'Strategies',
              sub: '0 saved',
              iconBg: 'rgba(139,255,69,0.08)',
              icon: <Layers className="w-[15px] h-[15px]" strokeWidth={1.8} color="var(--ffi-volt)" />,
            },
            {
              href: '/prep/runs',
              label: 'Run History',
              sub: '0 runs',
              iconBg: 'rgba(150,180,255,0.07)',
              icon: <History className="w-[15px] h-[15px]" strokeWidth={1.8} color="var(--ffi-ink-2)" />,
            },
          ] as const
        ).map(({ href, label, sub, iconBg, icon }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-[13px] p-3 transition-all duration-150 hover:-translate-y-px"
            style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
          >
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center mb-2.5"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
            <p
              className="font-bold text-[12px] leading-[1.2]"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
            >
              {label}
            </p>
            <p
              className="text-[10px] mt-1 tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)' }}
            >
              {sub}
            </p>
          </Link>
        ))}
      </div>

      {/* ── PLAYERS ───────────────────────────────────────────── */}
      <SectLabel>Players</SectLabel>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            {
              href: '/prep/players',
              label: 'Player Browser',
              sub: '3,048 in pool',
              iconBg: 'rgba(86,224,160,0.09)',
              icon: <Target className="w-[18px] h-[18px]" strokeWidth={1.8} color="#56E0A0" />,
            },
            {
              href: '/prep/keepers',
              label: 'Keepers',
              sub: '0 declared',
              iconBg: 'rgba(255,176,92,0.09)',
              icon: <Lock className="w-[18px] h-[18px]" strokeWidth={1.8} color="var(--ffi-warning)" />,
            },
          ] as const
        ).map(({ href, label, sub, icon, iconBg }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-2xl p-4 transition-all duration-150 hover:-translate-y-px"
            style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-2.5"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
            <p
              className="font-extrabold text-[15px] leading-snug"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
            >
              {label}
            </p>
            <p
              className="text-[11px] mt-1 tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-2)' }}
            >
              {sub}
            </p>
          </Link>
        ))}
      </div>

      {/* ── DRAFT DAY ─────────────────────────────────────────── */}
      <SectLabel>Draft Day</SectLabel>
      <div className="grid grid-cols-2 gap-2">
        {/* Dry Run */}
        <Link
          href="/prep/simulate"
          className="block rounded-2xl p-4 transition-all duration-150 hover:-translate-y-px"
          style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
        >
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-2.5"
            style={{ background: 'rgba(150,180,255,0.07)' }}
          >
            <Play className="w-[17px] h-[17px]" strokeWidth={1.8} color="var(--ffi-ink-2)" />
          </div>
          <p
            className="font-extrabold text-[15px]"
            style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
          >
            Dry Run
          </p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--ffi-ink-3)' }}>
            Simulate first
          </p>
        </Link>

        {/* Start Draft -- volt accent */}
        <Link
          href="/draft"
          className="block rounded-2xl p-4 transition-all duration-[120ms] hover:-translate-y-px"
          style={{
            background:
              'radial-gradient(160% 110% at 0% 0%, rgba(139,255,69,0.18), transparent 55%), var(--ffi-surface-2)',
            border: '1px solid rgba(139,255,69,0.22)',
            boxShadow: '0 8px 26px -8px var(--ffi-volt-glow)',
          }}
        >
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-2.5"
            style={{ background: 'rgba(139,255,69,0.12)' }}
          >
            <Zap className="w-[17px] h-[17px]" strokeWidth={1.8} color="var(--ffi-volt)" />
          </div>
          <p
            className="font-extrabold text-[15px]"
            style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-volt)' }}
          >
            Start Draft
          </p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--ffi-ink-2)' }}>
            Live auction mode
          </p>
        </Link>
      </div>

      {/* Data freshness -- functional data preserved, rendered below main nav */}
      <div className="mt-5 opacity-50">
        <DataFreshness />
      </div>

    </div>
  )
}
