'use client'

import { useState } from 'react'
import { completeOnboarding } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Coins } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { setTheme } = useTheme()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    try {
      // Apply the theme immediately via next-themes
      const selectedTheme = formData.get('theme') as string
      if (selectedTheme) {
        setTheme(selectedTheme)
      }

      const result = await completeOnboarding(formData)
      if (result?.error) {
        toast.error(result.error)
      }
    } catch (e: any) {
      // Next.js redirect() throws a NEXT_REDIRECT error — let it propagate
      if (e && typeof e === 'object' && 'digest' in e && typeof e.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) {
        throw e
      }
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg mb-4">
            <Coins className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Let's set up your profile</h1>
          <p className="text-sm text-muted-foreground">Tell us a bit about your financial goals</p>
        </div>
        
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/50">
          <CardHeader>
            <CardTitle>Personalize your experience</CardTitle>
            <CardDescription>
              This information helps us tailor insights to your needs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="onboarding-form" action={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" placeholder="John Doe" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Preferred Currency</Label>
                  <Select name="currency" defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Dashboard Theme</Label>
                  <Select name="theme" defaultValue="dark">
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Average Monthly Income</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input id="monthlyIncome" name="monthlyIncome" type="number" placeholder="5000" className="pl-7" required />
                </div>
                <p className="text-xs text-muted-foreground">Used for budget calculations and saving goals.</p>
              </div>

            </form>
          </CardContent>
          <CardFooter>
            <Button form="onboarding-form" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
