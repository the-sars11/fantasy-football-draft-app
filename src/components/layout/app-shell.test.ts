import { describe, it, expect } from 'vitest'
import { getActiveHref } from './app-shell'

describe('getActiveHref (RV-12 nav active-state)', () => {
  it('matches top-level tabs directly', () => {
    expect(getActiveHref('/prep')).toBe('/prep')
    expect(getActiveHref('/draft')).toBe('/draft')
    expect(getActiveHref('/draft/review')).toBe('/draft/review')
    expect(getActiveHref('/settings')).toBe('/settings')
  })

  it('resolves nested routes via longest-prefix match', () => {
    expect(getActiveHref('/draft/review/2026-week-1')).toBe('/draft/review')
    expect(getActiveHref('/prep/board')).toBe('/prep')
  })

  it('routes Setup pages under /prep and /draft to Settings, not their URL-tree tab', () => {
    expect(getActiveHref('/prep/configure')).toBe('/settings')
    expect(getActiveHref('/prep/configure/leagues')).toBe('/settings')
    expect(getActiveHref('/draft/setup')).toBe('/settings')
    expect(getActiveHref('/draft/setup/manual')).toBe('/settings')
  })

  it('does not mis-route the live draft room, which shares the /draft prefix', () => {
    expect(getActiveHref('/draft/live')).toBe('/draft')
  })
})
