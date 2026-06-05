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
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

type FilterType = 'all' | 'unread' | 'read'

export function NotificationsListClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [mounted, setMounted] = useState(false)
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

      // Fetch initial notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setNotifications(data)
      }

      // Realtime subscription
      console.log(`[Realtime Listing] Subscribing for user: ${user.id}`)
      channel = supabase
        .channel(`page-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            console.log('[Realtime Listing Event Received]', payload)
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification
              setNotifications((prev) => [newNotif, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotif = payload.new as Notification
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
              )
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[Realtime Listing Status change] Status: ${status}`, err || '')
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

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read)
    if (unread.length === 0) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      toast.error('Failed to mark all as read')
    } else {
      toast.success('All notifications marked as read')
    }
  }

  const deleteNotification = async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id))

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

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'budget_alert':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )
      case 'goal_milestone':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        )
      case 'large_transaction':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <DollarSign className="h-5 w-5" />
          </div>
        )
      default:
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <Info className="h-5 w-5" />
          </div>
        )
    }
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.is_read
    if (filter === 'read') return notif.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Filters and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-xl text-xs px-4 h-9',
              filter === 'all' 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'text-zinc-600 dark:text-zinc-400'
            )}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className={cn(
              'rounded-xl text-xs px-4 h-9',
              filter === 'unread' 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'text-zinc-600 dark:text-zinc-400'
            )}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('read')}
            className={cn(
              'rounded-xl text-xs px-4 h-9',
              filter === 'read' 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'text-zinc-600 dark:text-zinc-400'
            )}
          >
            Read ({notifications.length - unreadCount})
          </Button>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="rounded-xl text-xs px-3 h-9 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="rounded-xl text-xs px-3 h-9 border-red-200 dark:border-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-4 border border-zinc-150 dark:border-zinc-850">
                <Inbox className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">No notifications found</h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-[280px]">
                {filter === 'unread' 
                  ? "You have read all of your notifications! Nice job." 
                  : filter === 'read'
                    ? "You haven't read any notifications yet."
                    : "Your history is currently empty."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={cn(
                'rounded-2xl border transition-all duration-200 overflow-hidden relative group',
                notif.is_read
                  ? 'border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 opacity-70 hover:opacity-100'
                  : 'border-indigo-100 dark:border-indigo-950/50 bg-white dark:bg-zinc-950 shadow-sm ring-1 ring-indigo-50/50 dark:ring-indigo-950/10'
              )}
            >
              {!notif.is_read && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
              )}
              <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                {getNotifIcon(notif.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <h4 className={cn(
                      'text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate',
                      !notif.is_read && 'font-bold text-indigo-950 dark:text-indigo-200'
                    )}>
                      {notif.title}
                    </h4>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 flex items-center gap-1 select-none">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(notif.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed break-words max-w-3xl">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2 mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notif.id)}
                        className="h-8 px-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark as read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notif.id)}
                      className="h-8 px-2 text-xs font-semibold text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
