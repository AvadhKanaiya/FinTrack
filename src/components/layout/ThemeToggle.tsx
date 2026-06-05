'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    // Placeholder with same dimensions to avoid layout shift
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full w-9 h-9"
        aria-label="Toggle theme"
      >
        <span className="h-5 w-5" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative rounded-full w-9 h-9 overflow-hidden"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon — visible in dark mode */}
      <Sun
        className={`
          absolute h-5 w-5 text-amber-500 transition-all duration-300 ease-in-out
          ${isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 -rotate-90 scale-50'
          }
        `}
      />
      {/* Moon icon — visible in light mode */}
      <Moon
        className={`
          absolute h-5 w-5 text-indigo-500 transition-all duration-300 ease-in-out
          ${isDark
            ? 'opacity-0 rotate-90 scale-50'
            : 'opacity-100 rotate-0 scale-100'
          }
        `}
      />
    </Button>
  )
}
