'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bell,
  Check,
  Trash2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Info,
  Inbox,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'budget_alert' | 'goal_milestone' | 'large_transaction' | 'system'
  is_read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let channel: any

    const fetchAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch initial notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.is_read).length)
      }

      // 2. Subscribe to realtime notifications for the current user
      console.log(`[Realtime] Initializing subscription channel for user: ${user.id}`)
      channel = supabase
        .channel(`realtime-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            console.log('[Realtime Event Received]', payload)
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification
              setNotifications((prev) => [newNotif, ...prev])
              setUnreadCount((prev) => prev + 1)
              
              // Trigger a toast alert
              toast.success(newNotif.title, {
                description: newNotif.message,
                icon: <Bell className="h-4 w-4 text-indigo-500" />,
              })
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotif = payload.new as Notification
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
              )
              // Recalculate unread count
              setNotifications((currentNotifs) => {
                const updatedList = currentNotifs.map((n) =>
                  n.id === updatedNotif.id ? updatedNotif : n
                )
                setUnreadCount(updatedList.filter((n) => !n.is_read).length)
                return updatedList
              })
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              setNotifications((prev) => {
                const filtered = prev.filter((n) => n.id !== deletedId)
                setUnreadCount(filtered.filter((n) => !n.is_read).length)
                return filtered
              })
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[Realtime Status change] Status: ${status}`, err || '')
        })
    }

    fetchAndSubscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [mounted])

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      toast.error('Failed to mark notification as read')
      // Revert if error
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.is_read).length)
      }
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount === 0) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      toast.error('Failed to mark all notifications as read')
    } else {
      toast.success('All notifications marked as read')
    }
  }

  const deleteNotification = async (id: string) => {
    // Optimistic update
    const target = notifications.find(n => n.id === id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (target && !target.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete notification')
    }
  }

  const clearAll = async () => {
    if (notifications.length === 0) return

    // Optimistic update
    setNotifications([])
    setUnreadCount(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to clear notifications')
    } else {
      toast.success('All notifications cleared')
    }
  }

  // Relative time helper that runs fully client-side to prevent hydration mismatch
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'budget_alert':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        )
      case 'goal_milestone':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        )
      case 'large_transaction':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <DollarSign className="h-4 w-4" />
          </div>
        )
      default:
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <Info className="h-4 w-4" />
          </div>
        )
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notifications</span>
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] sm:w-[380px] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-0 focus:outline-none overflow-hidden z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">Notifications</p>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-1"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={clearAll}
                title="Clear all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-3 border border-zinc-100 dark:border-zinc-800">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">All caught up!</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px]">
                You have no notifications. Trigger one by hitting a budget limit or saving milestone.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  'flex gap-3 p-4 transition-colors relative group',
                  notif.is_read 
                    ? 'opacity-70 hover:opacity-100 bg-transparent' 
                    : 'bg-indigo-50/20 dark:bg-indigo-500/5'
                )}
              >
                {/* Unread marker bar */}
                {!notif.is_read && (
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600" />
                )}

                {getNotifIcon(notif.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      'text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate',
                      !notif.is_read && 'font-bold'
                    )}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 select-none">
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-normal break-words">
                    {notif.message}
                  </p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-md"
                        onClick={() => markAsRead(notif.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] font-medium text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-auto"
                      onClick={() => deleteNotification(notif.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
