'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  PieChart, 
  Target, 
  CreditCard,
  Wallet,
  Settings,
  Tag,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const navItems = [
  { name: 'Dashboard',    href: '/dashboard',   icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Analytics',    href: '/analytics',   icon: PieChart },
  { name: 'Categories',   href: '/categories',  icon: Tag },
  { name: 'Budgets',      href: '/budgets',     icon: Wallet },
  { name: 'Goals',        href: '/goals',       icon: Target },
  { name: 'Subscriptions',href: '/subscriptions',icon: CreditCard },
  { name: 'Notifications',href: '/notifications',icon: Bell },
]

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-zinc-50 dark:bg-zinc-950 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:bg-zinc-50/50 md:dark:bg-zinc-950/50 md:backdrop-blur-xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            FinTrack
          </Link>
        </div>
        
        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' 
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400')} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              pathname === '/settings' || pathname.startsWith('/settings/')
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50'
            )}
          >
            <Settings className={cn('h-5 w-5', pathname === '/settings' || pathname.startsWith('/settings/')
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-zinc-400'
            )} />
            Settings
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </>
  )
}
