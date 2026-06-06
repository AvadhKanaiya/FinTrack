'use client'

import { useState, useEffect, useRef, useActionState, useMemo } from 'react'
import { useTheme } from 'next-themes'
import {
  User, Lock, Bell, Palette, ChevronRight, Loader2, Check,
  Trash2, Mail, DollarSign, Shield, AlertTriangle, Eye, EyeOff,
  Sun, Moon, Monitor, CheckCircle2, TrendingUp, LogOut, Download,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateProfile, updateAppearance, updateEmail, updatePassword, signOut, updateNotificationSettings } from '@/app/(app)/settings/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  useUserPreferences,
  DATE_FORMAT_LABELS,
  NUMBER_FORMAT_LABELS,
  type DateFormat,
  type NumberFormat,
  formatDateStatic,
} from '@/components/providers/UserPreferencesContext'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  id: string
  email: string
  created_at: string
}

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  currency: string | null
  monthly_income: number | null
  theme: string | null
  date_format: string | null
  number_format: string | null
  notif_budget_alerts?: boolean | null
  notif_goal_milestones?: boolean | null
  notif_weekly_summary?: boolean | null
  notif_large_transactions?: boolean | null
  notif_monthly_report?: boolean | null
  large_transaction_threshold?: number | null
}


interface Props {
  user: UserData
  profile: Profile | null
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Name, income, currency' },
  { id: 'account', label: 'Account', icon: Mail, description: 'Email & password' },
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme & display' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts & reminders' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Danger zone' },
] as const

type TabId = (typeof TABS)[number]['id']

type ActionState = {
  error?: string
  success?: boolean
  message?: string
  ts?: number   // timestamp to force effect re-run on repeated submits
}

const initialState: ActionState = {
  error: undefined,
  success: false,
  message: undefined,
  ts: 0,
}

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { code: 'GBP', label: 'GBP — British Pound', symbol: '£' },
  { code: 'INR', label: 'INR — Indian Rupee', symbol: '₹' },
  { code: 'JPY', label: 'JPY — Japanese Yen', symbol: '¥' },
  { code: 'CAD', label: 'CAD — Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', label: 'AUD — Australian Dollar', symbol: 'A$' },
  { code: 'CHF', label: 'CHF — Swiss Franc', symbol: 'Fr' },
  { code: 'SGD', label: 'SGD — Singapore Dollar', symbol: 'S$' },
  { code: 'AED', label: 'AED — UAE Dirham', symbol: 'د.إ' },
]

export function SettingsClient({ user, profile }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab') as TabId | null
      if (tabParam && ['profile', 'account', 'appearance', 'notifications', 'security'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
      {/* Sidebar nav */}
      <aside className="w-full md:w-56 shrink-0">
        <nav className="flex gap-2 overflow-x-auto pb-3 scrollbar-none md:flex-col md:space-y-1 md:pb-0 sticky top-6 z-10">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-left transition-all duration-150 shrink-0 md:w-full md:gap-3',
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-50 border border-zinc-200 dark:border-zinc-800 md:border-none'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400')} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{tab.label}</p>
                  <p className={cn('text-[11px] mt-0.5 truncate hidden md:block', active ? 'text-indigo-500/70 dark:text-indigo-400/70' : 'text-muted-foreground')}>
                    {tab.description}
                  </p>
                </div>
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-indigo-400 hidden md:block" />}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Panel */}
      <div className="flex-1 min-w-0">
        {activeTab === 'profile' && <ProfileSection user={user} profile={profile} />}
        {activeTab === 'account' && <AccountSection user={user} profile={profile} />}
        {activeTab === 'appearance' && <AppearanceSection profile={profile} />}
        {activeTab === 'notifications' && <NotificationsSection profile={profile} />}
        {activeTab === 'security' && <SecuritySection />}
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-950 shadow-sm p-6 space-y-5">
      <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start">
      <div className="pt-1 md:pt-2">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ user, profile }: { user: UserData; profile: Profile | null }) {
  const { setPreferences } = useUserPreferences()

  // ── Controlled field state (initialised from server-fetched profile) ──────
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [monthlyIncome, setMonthlyIncome] = useState(
    profile?.monthly_income != null ? String(profile.monthly_income) : ''
  )
  const [currency, setCurrency] = useState(profile?.currency ?? 'USD')

  // ── Live avatar initials derived from the controlled fullName ────────────
  const initials = fullName.trim()
    ? fullName.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
      fd.set('currency', currency)
      const result = await updateProfile(fd)
      return { ...result, ts: Date.now() }
    },
    initialState
  )

  useEffect(() => {
    if (!state.ts) return                       // skip initial render
    if (state.success) {
      toast.success('Profile updated successfully!')
      setPreferences({ currency })
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state.ts]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <SectionCard title="Public profile" description="Your personal details stored in your account.">
        {/* Avatar preview — updates live as the user types their name */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-lg select-none">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold">{fullName || 'No name set'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Member since{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-4 pt-2">
          {/* Full name — controlled so avatar & display name update live */}
          <FieldRow label="Full name" hint="Displayed across the app">
            <Input
              id="full_name"
              name="full_name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </FieldRow>

          {/* Read-only email */}
          <FieldRow label="Email" hint="Change this in the Account tab">
            <Input value={user.email} readOnly disabled className="opacity-60 cursor-not-allowed" />
          </FieldRow>

          {/* Currency — controlled */}
          <FieldRow label="Currency" hint="Used for all monetary amounts">
            <Select value={currency} onValueChange={v => setCurrency(v ?? 'USD')}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span className="w-7 text-right font-mono text-xs text-muted-foreground shrink-0">{c.symbol}</span>
                      <span>{c.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Monthly income — controlled */}
          <FieldRow label="Monthly income" hint="Used for budget & savings insights">
            <div className="relative">
              <TrendingUp className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="monthly_income"
                name="monthly_income"
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncome}
                onChange={e => setMonthlyIncome(e.target.value)}
                placeholder="5000.00"
                className="pl-8"
              />
            </div>
          </FieldRow>

          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

          <div className="flex justify-end pt-2">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={pending}>
              {pending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                : <><Check className="mr-2 h-4 w-4" />Save changes</>}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}

// ─── Account section ──────────────────────────────────────────────────────────

// Password strength helper
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' }
  if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500' }
  return { score, label: 'Very strong', color: 'bg-emerald-400' }
}

function AccountSection({ user, profile }: { user: UserData; profile: Profile | null }) {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const emailRef = useRef<HTMLFormElement>(null)
  const pwRef = useRef<HTMLFormElement>(null)

  const strength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword.length > 0 && confirmPw.length > 0 && newPassword === confirmPw

  // ── Email action ───────────────────────────────────────────────────────────
  const [emailState, emailAction, emailPending] = useActionState(
    async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
      const result = await updateEmail(fd)
      return { ...result, ts: Date.now() }
    },
    initialState
  )

  useEffect(() => {
    if (!emailState.ts) return
    if (emailState.success) {
      toast.success(emailState.message ?? 'Email address updated successfully!')
      setNewEmail('')
      emailRef.current?.reset()
      router.refresh()
    } else if (emailState.error) toast.error(emailState.error)
  }, [emailState.ts, router])

  // ── Password action ────────────────────────────────────────────────────────
  const [pwState, pwAction, pwPending] = useActionState(
    async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
      const result = await updatePassword(fd)
      return { ...result, ts: Date.now() }
    },
    initialState
  )

  useEffect(() => {
    if (!pwState.ts) return
    if (pwState.success) {
      toast.success('Password changed successfully!')
      setNewPassword('')
      setConfirmPw('')
      setShowPw(false)
      setShowConfirm(false)
      pwRef.current?.reset()
    } else if (pwState.error) toast.error(pwState.error)
  }, [pwState.ts])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const accountAge = (() => {
    const created = new Date(user.created_at)
    const now = new Date()
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 1) return 'Today'
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.floor(days / 30)} months`
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`
  })()

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id)
      setCopied(true)
      toast.success('User ID copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Failed to copy') }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <div className="space-y-5">
      {/* ─── Account overview ──────────────────────────────────────────── */}
      <SectionCard title="Account overview" description="Your account details and status.">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg select-none shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {/* Name & email */}
            <div>
              <p className="text-sm font-semibold">{profile?.full_name || 'No name set'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {/* Stat pills */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Email verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 text-xs font-medium">
                <Shield className="h-3 w-3" />
                Account age: {accountAge}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 text-xs font-medium">
                <Lock className="h-3 w-3" />
                Password auth
              </span>
            </div>
          </div>
        </div>

        {/* User ID */}
        {/* <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">User ID</p>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-500 truncate">{user.id}</p>
            </div>
            <Button
              id="copy-user-id"
              variant="ghost"
              size="sm"
              className="shrink-0 h-7 px-2 text-xs"
              onClick={handleCopyId}
            >
              {copied
                ? <><CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />Copied</>
                : 'Copy'}
            </Button>
          </div>
        </div> */}

        {/* Joined date & last sign-in */}
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Member since</p>
            <p className="text-sm font-medium">
              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Current session</p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active now</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ─── Change email ──────────────────────────────────────────────── */}
      <SectionCard title="Email address" description="Update the email address associated with your account.">
        <form ref={emailRef} action={emailAction} className="space-y-4">
          <FieldRow label="Current email">
            <div className="flex items-center gap-2">
              <Input value={user.email} readOnly disabled className="opacity-60 cursor-not-allowed flex-1" />
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            </div>
          </FieldRow>
          <FieldRow label="New email" hint="Your new email address">
            <Input
              id="new-email"
              name="email"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              required
            />
          </FieldRow>

          {emailState?.error && <p className="text-sm text-red-500">{emailState.error}</p>}
          {emailState?.success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{emailState.message}</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              id="update-email-btn"
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={emailPending || !newEmail.trim()}
            >
              {emailPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                : <><Mail className="mr-2 h-4 w-4" />Update email</>}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* ─── Change password ───────────────────────────────────────────── */}
      <SectionCard title="Password" description="Use a strong password you don't use on other sites.">
        <form ref={pwRef} action={pwAction} className="space-y-4">
          <FieldRow label="New password" hint="Minimum 8 characters">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i <= strength.score ? strength.color : 'bg-zinc-200 dark:bg-zinc-800'
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={cn('text-[11px] font-medium', strength.color.replace('bg-', 'text-'))}>
                      {strength.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { test: newPassword.length >= 8, label: '8+ chars' },
                        { test: /[A-Z]/.test(newPassword), label: 'Uppercase' },
                        { test: /[0-9]/.test(newPassword), label: 'Number' },
                        { test: /[^A-Za-z0-9]/.test(newPassword), label: 'Symbol' },
                      ].map(rule => (
                        <span
                          key={rule.label}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors',
                            rule.test
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          )}
                        >
                          {rule.test && <Check className="inline h-2.5 w-2.5 mr-0.5" />}
                          {rule.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Confirm password">
            <div className="space-y-1">
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="pr-10"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPw.length > 0 && (
                <p className={cn('text-[11px] font-medium flex items-center gap-1',
                  passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                )}>
                  {passwordsMatch
                    ? <><CheckCircle2 className="h-3 w-3" /> Passwords match</>
                    : <><AlertTriangle className="h-3 w-3" /> Passwords don't match</>}
                </p>
              )}
            </div>
          </FieldRow>

          {pwState?.error && <p className="text-sm text-red-500">{pwState.error}</p>}
          {pwState?.success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Password updated successfully!</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              id="update-password-btn"
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={pwPending || newPassword.length < 8 || !passwordsMatch}
            >
              {pwPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</>
                : <><Lock className="mr-2 h-4 w-4" />Change password</>}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* ─── Sign out ──────────────────────────────────────────────────── */}
      <SectionCard title="Sign out" description="End your current session on this device.">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground max-w-md">
              You'll be redirected to the login page. Any unsaved changes will be lost.
            </p>
          </div>
          <Button
            id="sign-out-btn"
            variant="outline"
            className="shrink-0 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection({ profile }: { profile: Profile | null }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { setPreferences } = useUserPreferences()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Local state for display prefs (synced from profile on mount)
  const [dateFormat, setDateFormat] = useState<DateFormat>((profile?.date_format as DateFormat) ?? 'MMM_d_yyyy')
  const [numberFormat, setNumberFormat] = useState<NumberFormat>((profile?.number_format as NumberFormat) ?? 'comma')
  const [localTheme, setLocalTheme] = useState<string>(profile?.theme ?? 'system')

  // Keep theme in sync with next-themes
  useEffect(() => {
    if (mounted && theme) setLocalTheme(theme)
  }, [theme, mounted])

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
      fd.set('theme', localTheme)
      fd.set('date_format', dateFormat)
      fd.set('number_format', numberFormat)
      const result = await updateAppearance(fd)
      return { ...result, ts: Date.now() }
    },
    initialState
  )

  useEffect(() => {
    if (!state.ts) return
    if (state.success) {
      toast.success('Appearance preferences saved!')
      setPreferences({ dateFormat, numberFormat })
      setTheme(localTheme)
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state.ts]) // eslint-disable-line react-hooks/exhaustive-deps

  const THEME_OPTIONS = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Follows your OS' },
  ] as const

  // Live preview sample values
  const SAMPLE_DATE = '2024-01-15'
  const SAMPLE_AMOUNT = 1234.56

  // Local formatting helper for amount using selected numberFormat
  const localFormatAmount = (amount: number, showCurrency = true): string => {
    const localeMap: Record<NumberFormat, string> = {
      comma: 'en-US',
      dot:   'de-DE',
      space: 'fr-FR',
    }
    const locale = localeMap[numberFormat]
    try {
      return new Intl.NumberFormat(locale, {
        style: showCurrency ? 'currency' : 'decimal',
        currency: profile?.currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return new Intl.NumberFormat(locale, {
        style: showCurrency ? 'currency' : 'decimal',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Theme */}
      <SectionCard title="Theme" description="Choose how FinTrack looks. Applied immediately.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {THEME_OPTIONS.map(t => {
            const Icon = t.icon
            const active = mounted ? localTheme === t.id : t.id === 'system'
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setLocalTheme(t.id); setTheme(t.id) }}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-150',
                  active
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'
                )}
              >
                {active && (
                  <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center',
                  active ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800')}>
                  <Icon className={cn('h-5 w-5', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500')} />
                </div>
                <div className="text-center">
                  <p className={cn('text-sm font-semibold', active ? 'text-indigo-700 dark:text-indigo-300' : '')}>{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
        {mounted && resolvedTheme && (
          <p className="text-xs text-muted-foreground pt-1">
            Currently using <span className="font-medium text-foreground capitalize">{resolvedTheme}</span> mode.
          </p>
        )}
      </SectionCard>

      {/* Display preferences */}
      <SectionCard title="Display" description="Control how dates and numbers are formatted across the app.">
        <div className="space-y-4">
          <FieldRow label="Date format" hint="How dates appear in tables and reports">
            <Select value={dateFormat} onValueChange={v => setDateFormat((v ?? 'MMM_d_yyyy') as DateFormat)}>
              <SelectTrigger id="date_format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DATE_FORMAT_LABELS) as [DateFormat, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Number format" hint="Thousands separator and decimal style">
            <Select value={numberFormat} onValueChange={v => setNumberFormat((v ?? 'comma') as NumberFormat)}>
              <SelectTrigger id="number_format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(NUMBER_FORMAT_LABELS) as [NumberFormat, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        {/* Live preview */}
        <div className="mt-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live preview</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Date</p>
              <p className="text-sm font-medium tabular-nums">{formatDateStatic(SAMPLE_DATE, dateFormat)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Amount</p>
              <p className="text-sm font-medium tabular-nums text-emerald-600">{localFormatAmount(SAMPLE_AMOUNT)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Expense</p>
              <p className="text-sm font-medium tabular-nums text-red-500">−{localFormatAmount(SAMPLE_AMOUNT)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Large number</p>
              <p className="text-sm font-medium tabular-nums">{localFormatAmount(98765.43)}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 italic">
            Preview updates as you change selections above. Save to apply globally.
          </p>
        </div>

        {state?.error && <p className="text-sm text-red-500 mt-2">{state.error}</p>}

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={pending}>
            {pending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              : <><Check className="mr-2 h-4 w-4" />Save preferences</>}
          </Button>
        </div>
      </SectionCard>
    </form>
  )
}

// ─── Notifications section ────────────────────────────────────────────────────

function ToggleSwitch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'
      )}
    >
      <span className={cn(
        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200',
        checked ? 'translate-x-4' : 'translate-x-0'
      )} />
    </button>
  )
}

function NotificationsSection({ profile }: { profile: Profile | null }) {
  const [budgetAlerts, setBudgetAlerts] = useState(profile?.notif_budget_alerts ?? true)
  const [goalMilestones, setGoalMilestones] = useState(profile?.notif_goal_milestones ?? true)
  const [weeklySummary, setWeeklySummary] = useState(profile?.notif_weekly_summary ?? false)
  const [largeTransactions, setLargeTransactions] = useState(profile?.notif_large_transactions ?? true)
  const [monthlyReport, setMonthlyReport] = useState(profile?.notif_monthly_report ?? false)
  const [largeTxThreshold, setLargeTxThreshold] = useState(
    profile?.large_transaction_threshold != null ? String(profile.large_transaction_threshold) : '500'
  )

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
      fd.set('notif_budget_alerts', String(budgetAlerts))
      fd.set('notif_goal_milestones', String(goalMilestones))
      fd.set('notif_weekly_summary', String(weeklySummary))
      fd.set('notif_large_transactions', String(largeTransactions))
      fd.set('notif_monthly_report', String(monthlyReport))
      fd.set('large_transaction_threshold', largeTxThreshold)
      const result = await updateNotificationSettings(fd)
      return { ...result, ts: Date.now() }
    },
    initialState
  )

  useEffect(() => {
    if (!state.ts) return
    if (state.success) {
      toast.success('Notification preferences saved successfully!')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state.ts])

  return (
    <form action={formAction} className="space-y-5">
      <SectionCard title="Email notifications" description="Choose which events trigger an email to your inbox.">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between py-3.5 first:pt-0">
            <div className="pr-6">
              <p className="text-sm font-medium">Budget alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Get notified when you're approaching or exceed a budget limit</p>
            </div>
            <ToggleSwitch
              id="notif-budget_alerts"
              checked={budgetAlerts}
              onChange={setBudgetAlerts}
            />
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div className="pr-6">
              <p className="text-sm font-medium">Goal milestones</p>
              <p className="text-xs text-muted-foreground mt-0.5">Celebrate when you hit 25%, 50%, 75% and 100% of a goal</p>
            </div>
            <ToggleSwitch
              id="notif-goal_milestones"
              checked={goalMilestones}
              onChange={setGoalMilestones}
            />
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div className="pr-6">
              <p className="text-sm font-medium">Large transactions</p>
              <p className="text-xs text-muted-foreground mt-0.5">Alert on transactions above your set threshold</p>
            </div>
            <ToggleSwitch
              id="notif-large_transactions"
              checked={largeTransactions}
              onChange={setLargeTransactions}
            />
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div className="pr-6">
              <p className="text-sm font-medium">Weekly summary</p>
              <p className="text-xs text-muted-foreground mt-0.5">A digest of your spending every Monday morning</p>
            </div>
            <ToggleSwitch
              id="notif-weekly_summary"
              checked={weeklySummary}
              onChange={setWeeklySummary}
            />
          </div>

          <div className="flex items-center justify-between py-3.5 last:pb-0">
            <div className="pr-6">
              <p className="text-sm font-medium">Monthly report</p>
              <p className="text-xs text-muted-foreground mt-0.5">Full spending report at the end of each month</p>
            </div>
            <ToggleSwitch
              id="notif-monthly_report"
              checked={monthlyReport}
              onChange={setMonthlyReport}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Thresholds" description="Set values that trigger certain notifications.">
        <FieldRow label="Large transaction" hint="Alert if a single transaction exceeds this">
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="large-tx-threshold"
              name="large_transaction_threshold"
              type="number"
              min="0"
              step="10"
              value={largeTxThreshold}
              onChange={e => setLargeTxThreshold(e.target.value)}
              className="pl-8"
              required
            />
          </div>
        </FieldRow>

        {state?.error && <p className="text-sm text-red-500 mt-2">{state.error}</p>}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={pending}
          >
            {pending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving preferences…</>
            ) : (
              <><Check className="mr-2 h-4 w-4" />Save preferences</>
            )}
          </Button>
        </div>
      </SectionCard>
    </form>
  )
}


// ─── Security section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [confirmText, setConfirmText] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [exporting, setExporting] = useState(false)
  const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

  // Generate last 12 months dynamically
  const months = useMemo(() => {
    const list = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // yyyy-MM
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      list.push({ value, label })
    }
    return list
  }, [])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const supabase = createClient()
      
      let query = supabase
        .from('transactions')
        .select('*, categories(name)')
        .order('transaction_date', { ascending: false })

      if (selectedMonth !== 'all') {
        const [yearStr, monthStr] = selectedMonth.split('-')
        const year = parseInt(yearStr, 10)
        const month = parseInt(monthStr, 10)
        const startDate = `${yearStr}-${monthStr}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`

        query = query
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
      }

      const { data: transactions, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      if (!transactions || transactions.length === 0) {
        toast.info(
          selectedMonth === 'all' 
            ? 'No transactions found to export.' 
            : `No transactions found for ${months.find(m => m.value === selectedMonth)?.label || selectedMonth}.`
        )
        return
      }

      // CSV headers
      const headers = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Note']
      
      // Helper to escape CSV values
      const escapeCSVField = (val: any): string => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      // Convert rows
      const rows = transactions.map(tx => {
        const date = tx.transaction_date
        const title = escapeCSVField(tx.title)
        const type = tx.type
        const category = escapeCSVField(tx.categories?.name || 'Uncategorized')
        const amount = tx.amount
        const note = escapeCSVField(tx.note)

        return `${date},${title},${type},${category},${amount},${note}`
      })

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n') // Adding BOM for Excel compatibility with UTF-8
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const filenameSuffix = selectedMonth === 'all' ? 'all_time' : selectedMonth
      link.setAttribute('href', url)
      link.setAttribute('download', `transactions_export_${filenameSuffix}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('CSV export completed successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(`Export failed: ${err.message || 'Unknown error'}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Active sessions" description="Review your current logged-in sessions.">
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current session</p>
            <p className="text-xs text-muted-foreground mt-0.5">This device — Active now</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </SectionCard>

      <SectionCard title="Export your data" description="Download a full copy of your transactions.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download your transaction history as a CSV file to import into other software like Excel, Google Sheets, or Numbers.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="export-format" className="text-sm font-semibold">Format</Label>
              <Select value="csv" disabled>
                <SelectTrigger id="export-format" className="w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <SelectValue placeholder="CSV" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Comma-Separated Values)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="export-month" className="text-sm font-semibold">Select Month</Label>
              <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? 'all')}>
                <SelectTrigger id="export-month" className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectValue placeholder="All transactions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All transactions (All Time)</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              id="export-data-btn"
              onClick={handleExportCSV}
              disabled={exporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-red-200 dark:border-red-900/60">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Danger zone</h3>
            <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-0.5">These actions are permanent and cannot be undone.</p>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            Deleting your account permanently removes all your data — transactions, budgets, goals, categories and profile information.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-sm text-red-700 dark:text-red-400">
              Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="border-red-300 dark:border-red-800 focus-visible:ring-red-400"
            />
          </div>
          <Button
            id="delete-account-btn"
            variant="destructive"
            disabled={confirmText !== CONFIRM_PHRASE}
            className="bg-red-600 hover:bg-red-700 text-white dark:text-white disabled:bg-red-100/50 dark:disabled:bg-red-950/40 disabled:text-red-400 dark:disabled:text-red-600 disabled:opacity-100"
            onClick={() => toast.error('Account deletion is disabled in demo mode.')}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete my account permanently
          </Button>
        </div>
      </div>
    </div>
  )
}
