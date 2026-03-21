'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={collapsed ? 'Toggle theme' : undefined}
      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
    >
      <Sun className="h-4 w-4 shrink-0 dark:hidden" />
      <Moon className="hidden h-4 w-4 shrink-0 dark:block" />
      {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
    </Button>
  )
}

export function ThemeToggleMobile() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-muted-foreground h-8 px-2"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  )
}
