'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
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
  // BUG-R13-05: derive the transition direction from the pathname change using
  // React's blessed "store info from previous renders" pattern (setState during
  // render), instead of mutating refs in the render body. Behavior is identical:
  // on a route change we set the new direction and record the path, React
  // immediately re-renders, and the second pass stabilizes (prevPath === pathname).
  const [prevPath, setPrevPath] = useState<string | null>(null)
  const [direction, setDirection] = useState<NavDirection>('fade')

  if (prevPath !== pathname) {
    setDirection(getDirection(prevPath, pathname))
    setPrevPath(pathname)
  }

  return (
    <NavContext.Provider
      value={{
        direction,
        previousPath: pathname,
      }}
    >
      {children}
    </NavContext.Provider>
  )
}
