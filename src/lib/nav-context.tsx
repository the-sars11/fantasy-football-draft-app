'use client'

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export type NavDirection = 'left' | 'right' | 'up' | 'down' | 'fade'

interface NavContextValue {
  direction: NavDirection
  previousPath: string | null
}

const NavContext = createContext<NavContextValue>({
  direction: 'fade',
  previousPath: null,
})

export function useNavDirection() {
  return useContext(NavContext)
}

// Route hierarchy for determining drill direction
const routeDepth: Record<string, number> = {
  '/prep': 0,
  '/prep/board': 1,
  '/prep/strategies': 1,
  '/prep/runs': 1,
  '/prep/configure': 1,
  '/draft': 0,
  '/draft/setup': 1,
  '/draft/live': 2,
  '/draft/review': 1,
  '/settings': 0,
}

// Routes that use immersive vertical transitions
const immersiveRoutes = ['/draft/live']

function getDirection(from: string | null, to: string): NavDirection {
  if (!from) return 'fade'

  // Settings always fades
  if (to === '/settings' || from === '/settings') {
    return 'fade'
  }

  // Entering live draft - slide up (immersive)
  if (immersiveRoutes.includes(to)) {
    return 'up'
  }

  // Exiting live draft - slide down
  if (immersiveRoutes.includes(from)) {
    return 'down'
  }

  // Get depth for hierarchical navigation
  const fromDepth = routeDepth[from] ?? 0
  const toDepth = routeDepth[to] ?? 0

  // Drilling in = slide left, backing out = slide right
  if (toDepth > fromDepth) return 'left'
  if (toDepth < fromDepth) return 'right'

  // Same level navigation (e.g., prep → draft) - fade
  return 'fade'
}

export function NavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)
  const directionRef = useRef<NavDirection>('fade')

  // Update direction based on route change
  if (previousPathRef.current !== pathname) {
    directionRef.current = getDirection(previousPathRef.current, pathname)
    previousPathRef.current = pathname
  }

  return (
    <NavContext.Provider
      value={{
        direction: directionRef.current,
        previousPath: previousPathRef.current,
      }}
    >
      {children}
    </NavContext.Provider>
  )
}
