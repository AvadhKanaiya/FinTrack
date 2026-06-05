'use client'

import { useState, useEffect } from 'react'
import { Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/layout/NotificationCenter'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? null)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()
        if (profile) {
          if (profile.full_name) setFullName(profile.full_name)
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
        }
      }
      setMounted(true)
    }
    fetchUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName
    ? fullName.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : 'U'

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl px-6 w-full">
      <Button
        variant="ghost"
        size="icon"
        className="mr-1 rounded-full md:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <form className="relative w-full max-w-md hidden md:flex" onSubmit={(e) => e.preventDefault()}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search transactions..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationCenter />

        {/* User menu */}
        {!mounted ? (
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-800">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-semibold text-xs">
                U
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-800">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="User" />
                    ) : (
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-semibold text-xs">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-zinc-900 dark:text-zinc-50">{fullName || 'User'}</p>
                    <p className="text-xs leading-none text-zinc-500 dark:text-zinc-400">{userEmail || 'My Account'}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer">
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}

