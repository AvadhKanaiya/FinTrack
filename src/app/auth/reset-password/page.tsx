'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Wallet, Eye, EyeOff, Loader2, CheckCircle2, Lock, AlertTriangle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500 text-red-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500 text-orange-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500 text-yellow-500' }
  if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500 text-emerald-500' }
  return { score, label: 'Very strong', color: 'bg-emerald-400 text-emerald-400' }
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())
  
  const [hasSession, setHasSession] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const resetCompleteRef = useRef(false)
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const strength = getPasswordStrength(password)
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')

    if (tokenHash) {
      setLoadingSession(true)
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (error) {
            toast.error(error.message)
            setHasSession(false)
          } else {
            setHasSession(true)
            // Clean the token hash from the URL parameters
            router.replace('/auth/reset-password')
          }
          setLoadingSession(false)
        })
        .catch(() => {
          toast.error('An unexpected verification error occurred.')
          setHasSession(false)
          setLoadingSession(false)
        })
    } else {
      // Check current session immediately
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setHasSession(true)
        }
        setLoadingSession(false)
      })

      // Listen for auth state change event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (resetCompleteRef.current) return
        if (session) {
          setHasSession(true)
        } else {
          setHasSession(false)
        }
        setLoadingSession(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabase, searchParams, router])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match.")
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) {
        toast.error(error.message)
      } else {
        resetCompleteRef.current = true
        setLoadingSession(true)
        await supabase.auth.signOut()
        toast.success('Password updated successfully! Please log in with your new password.')
        router.push('/login')
      }
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying secure recovery session...</p>
        </div>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md">
          <Card className="border-red-200 dark:border-red-900 shadow-xl bg-white dark:bg-zinc-950">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-red-600 dark:text-red-400">Invalid Recovery Session</CardTitle>
              <CardDescription>
                The password recovery session is expired, invalid, or missing. Please request a new password recovery link.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => router.push('/login')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Back to Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg mb-4">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FinTrack</h1>
          <p className="text-sm text-muted-foreground">Reset your account password</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle>Set new password</CardTitle>
            <CardDescription>
              Please enter your new strong password below to secure your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                
                {/* Strength Meter */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            i <= strength.score ? strength.color.split(' ')[0] : 'bg-zinc-200 dark:bg-zinc-800'
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={cn('font-medium', strength.color.split(' ')[1])}>
                        {strength.label}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { test: password.length >= 8, label: '8+ chars' },
                          { test: /[A-Z]/.test(password), label: 'Uppercase' },
                          { test: /[0-9]/.test(password), label: 'Number' },
                          { test: /[^A-Za-z0-9]/.test(password), label: 'Symbol' },
                        ].map(rule => (
                          <span
                            key={rule.label}
                            className={cn(
                              'px-1.5 py-0.5 rounded-full font-medium transition-colors text-[9px]',
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

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={cn('text-[11px] font-medium flex items-center gap-1',
                    passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  )}>
                    {passwordsMatch
                      ? <><CheckCircle2 className="h-3 w-3" /> Passwords match</>
                      : <><AlertTriangle className="h-3 w-3" /> Passwords don't match</>}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4" disabled={submitting || password.length < 8 || !passwordsMatch}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating Password...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" />Reset Password</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying secure recovery session...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
