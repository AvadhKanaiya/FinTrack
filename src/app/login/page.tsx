'use client'

import { useState } from 'react'
import { login, signup, forgotPassword } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Wallet, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (authMode === 'signup' || authMode === 'forgot_password') {
      const email = (formData.get('email') as string)?.trim()
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!email || !emailRegex.test(email)) {
        toast.error('Please enter a valid email address.')
        return
      }
    }

    setIsLoading(true)
    try {
      let result: any
      if (authMode === 'login') {
        result = await login(formData)
      } else if (authMode === 'signup') {
        result = await signup(formData)
      } else {
        result = await forgotPassword(formData)
      }

      if (result?.error) {
        toast.error(result.error)
      } else if (result?.message) {
        toast.success(result.message)
        if (authMode === 'forgot_password') {
          setAuthMode('login')
        }
      } else {
        toast.success(
          authMode === 'login'
            ? 'Logged in successfully!'
            : authMode === 'signup'
            ? 'Verification email sent! Please check your inbox.'
            : 'Password reset link sent!'
        )
      }
    } catch (e: unknown) {
      // Next.js redirect() throws a NEXT_REDIRECT error — let it propagate
      if (e && typeof e === 'object' && 'digest' in e && typeof (e as { digest: unknown }).digest === 'string' && (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
        toast.success(authMode === 'login' ? 'Logged in successfully!' : 'Account created successfully!')
        throw e
      }
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg mb-4">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FinTrack</h1>
          <p className="text-sm text-muted-foreground">Your personalized financial companion</p>
        </div>
        
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50">
          <CardHeader>
            <CardTitle>
              {authMode === 'login' ? 'Welcome back' : authMode === 'signup' ? 'Create an account' : 'Reset your password'}
            </CardTitle>
            <CardDescription>
              {authMode === 'login' 
                ? 'Enter your credentials to access your account' 
                : authMode === 'signup' 
                ? 'Sign up to start tracking your finances' 
                : 'Enter your email address to receive a recovery link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required />
              </div>
              
              {authMode !== 'forgot_password' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot_password')}
                        className="text-xs text-indigo-600 hover:underline font-medium focus:outline-none"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button form="auth-form" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{authMode === 'forgot_password' ? 'Sending...' : authMode === 'login' ? 'Signing In...' : 'Signing Up...'}</>
              ) : (
                authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Sign Up' : 'Send Reset Link'
              )}
            </Button>
            
            <div className="text-center text-sm">
              {authMode === 'forgot_password' ? (
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-indigo-600 hover:underline font-medium focus:outline-none"
                >
                  Back to log in
                </button>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-indigo-600 hover:underline font-medium focus:outline-none"
                  >
                    {authMode === 'login' ? 'Sign up' : 'Log in'}
                  </button>
                </>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
