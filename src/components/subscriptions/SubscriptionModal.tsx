'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/(app)/subscriptions/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

const initialState = { error: undefined as string | undefined, success: false }

interface Subscription {
  id: string
  name: string
  amount: number
  renewal_date: string
  billing_cycle: string
}

// ─── Add Subscription Modal ──────────────────────────────────────────────────
export function SubscriptionModal() {
  const { currencySymbol } = useUserPreferences()
  const [open, setOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('billing_cycle', billingCycle)
      const result = await createSubscription(formData)
      return result as typeof initialState
    },
    initialState
  )

  useEffect(() => {
    if (state?.success) {
      toast.success('Subscription added successfully!')
      setOpen(false)
      formRef.current?.reset()
      setBillingCycle('monthly')
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
          <DialogDescription>Track a new recurring service or expense.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sub-name" className="text-right">Name</Label>
              <Input
                id="sub-name"
                name="name"
                placeholder="e.g. Netflix, Spotify, Gym"
                className="col-span-3"
                required
              />
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sub-amount" className="text-right">Amount</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="sub-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="14.99"
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Billing Cycle</Label>
              <div className="col-span-3">
                <Select
                  value={billingCycle}
                  onValueChange={(v) => v && setBillingCycle(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Renewal Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sub-renewal" className="text-right">Renewal Date</Label>
              <Input
                id="sub-renewal"
                name="renewal_date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="col-span-3"
                required
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 mb-4 px-1">{state.error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Subscription'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Subscription Modal ──────────────────────────────────────────────────
export function EditSubscriptionModal({ subscription }: { subscription: Subscription }) {
  const { currencySymbol } = useUserPreferences()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState(subscription.billing_cycle)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('billing_cycle', billingCycle)
      const result = await updateSubscription(subscription.id, formData)
      return result as typeof initialState
    },
    initialState
  )

  useEffect(() => {
    if (open) {
      setBillingCycle(subscription.billing_cycle)
      setShowConfirmDelete(false)
    }
  }, [open, subscription])

  useEffect(() => {
    if (!open) {
      setShowConfirmDelete(false)
    }
  }, [open])

  useEffect(() => {
    if (state?.success) {
      toast.success('Subscription updated successfully!')
      setOpen(false)
      router.refresh()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteSubscription(subscription.id)
    if (result?.error) {
      toast.error(result.error)
      setDeleting(false)
    } else {
      toast.success('Subscription deleted')
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
            title="Edit subscription"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>Update recurring service details.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sub-name" className="text-right">Name</Label>
              <Input
                id="edit-sub-name"
                name="name"
                defaultValue={subscription.name}
                className="col-span-3"
                required
              />
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sub-amount" className="text-right">Amount</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="edit-sub-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={subscription.amount}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Billing Cycle</Label>
              <div className="col-span-3">
                <Select
                  value={billingCycle}
                  onValueChange={(v) => v && setBillingCycle(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Renewal Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sub-renewal" className="text-right">Renewal Date</Label>
              <Input
                id="edit-sub-renewal"
                name="renewal_date"
                type="date"
                defaultValue={subscription.renewal_date}
                min={new Date().toISOString().split('T')[0]}
                className="col-span-3"
                required
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 mb-4 px-1">{state.error}</p>
          )}

          {showConfirmDelete ? (
            <div className="flex flex-col gap-3 w-full bg-red-50 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-100 dark:border-red-900/30 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5">
                <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Delete subscription?
                  </p>
                  <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5">
                    Are you sure you want to permanently delete this subscription? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1 shadow-sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Yes, Delete
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 sm:mr-auto"
                onClick={() => setShowConfirmDelete(true)}
                disabled={pending || deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending || deleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={pending || deleting}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
