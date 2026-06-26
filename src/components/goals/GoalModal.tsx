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
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { createGoal, updateGoal, deleteGoal } from '@/app/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

// Goal icon options
const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💎', '📱', '🎓', '💍', '🏖️', '🌍', '💰', '🏋️', '🎮', '🎵', '🛍️', '🌱', '🏆', '🚀', '💻', '🎨']

const initialState = { error: undefined as string | undefined, success: false }

interface Goal {
  id: string
  title: string
  target_amount: number
  current_amount: number
  deadline: string | null
  icon: string | null
}

// ─── Add Goal Modal ──────────────────────────────────────────────────────────
export function GoalModal() {
  const { currencySymbol } = useUserPreferences()
  const [open, setOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('🎯')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('icon', selectedIcon)
      const result = await createGoal(formData)
      return result as typeof initialState
    },
    initialState
  )

  useEffect(() => {
    if (state?.success) {
      toast.success('Goal created!')
      setOpen(false)
      formRef.current?.reset()
      setSelectedIcon('🎯')
      setShowIconPicker(false)
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
            New Goal
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Savings Goal</DialogTitle>
          <DialogDescription>Set a new savings target to work towards.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Icon picker */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Icon</Label>
              <div className="col-span-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-transparent text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-xl">{selectedIcon}</span>
                  <span className="text-xs text-muted-foreground">Pick icon</span>
                </button>
                {showIconPicker && (
                  <div className="rounded-xl border bg-white dark:bg-zinc-900 shadow-lg p-3">
                    <div className="grid grid-cols-10 gap-1">
                      {GOAL_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(icon)
                            setShowIconPicker(false)
                          }}
                          className={`text-xl p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                            selectedIcon === icon ? 'bg-indigo-50 dark:bg-indigo-950' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal-title" className="text-right">Title</Label>
              <Input
                id="goal-title"
                name="title"
                placeholder="e.g. Emergency Fund"
                className="col-span-3"
                required
              />
            </div>

            {/* Target Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal-target" className="text-right">Target</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="goal-target"
                  name="target_amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="10000.00"
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Current Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal-current" className="text-right">Saved</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="goal-current"
                  name="current_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal-deadline" className="text-right">Deadline</Label>
              <Input
                id="goal-deadline"
                name="deadline"
                type="date"
                className="col-span-3"
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
                  Creating...
                </>
              ) : (
                'Create Goal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Goal Modal ─────────────────────────────────────────────────────────
export function EditGoalModal({ goal }: { goal: Goal }) {
  const { currencySymbol } = useUserPreferences()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState(goal.icon || '🎯')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('icon', selectedIcon)
      const result = await updateGoal(goal.id, formData)
      return result as typeof initialState
    },
    initialState
  )

  useEffect(() => {
    if (open) {
      setSelectedIcon(goal.icon || '🎯')
      setShowIconPicker(false)
      setShowConfirmDelete(false)
    }
  }, [open, goal])

  useEffect(() => {
    if (!open) {
      setShowConfirmDelete(false)
    }
  }, [open])

  useEffect(() => {
    if (state?.success) {
      toast.success('Goal updated!')
      setOpen(false)
      router.refresh()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteGoal(goal.id)
    if (result?.error) {
      toast.error(result.error)
      setDeleting(false)
    } else {
      toast.success('Goal deleted')
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
            title="Edit goal"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
          <DialogDescription>Update your savings goal details.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Icon picker */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Icon</Label>
              <div className="col-span-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-transparent text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-xl">{selectedIcon}</span>
                  <span className="text-xs text-muted-foreground">Pick icon</span>
                </button>
                {showIconPicker && (
                  <div className="rounded-xl border bg-white dark:bg-zinc-900 shadow-lg p-3">
                    <div className="grid grid-cols-10 gap-1">
                      {GOAL_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(icon)
                            setShowIconPicker(false)
                          }}
                          className={`text-xl p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                            selectedIcon === icon ? 'bg-indigo-50 dark:bg-indigo-950' : ''
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-goal-title" className="text-right">Title</Label>
              <Input
                id="edit-goal-title"
                name="title"
                defaultValue={goal.title}
                className="col-span-3"
                required
              />
            </div>

            {/* Target Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-goal-target" className="text-right">Target</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="edit-goal-target"
                  name="target_amount"
                  type="number"
                  step="0.01"
                  min="1"
                  defaultValue={goal.target_amount}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Current Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-goal-current" className="text-right">Saved</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <Input
                  id="edit-goal-current"
                  name="current_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={goal.current_amount}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-goal-deadline" className="text-right">Deadline</Label>
              <Input
                id="edit-goal-deadline"
                name="deadline"
                type="date"
                defaultValue={goal.deadline ?? ''}
                className="col-span-3"
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
                    Delete savings goal?
                  </p>
                  <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5">
                    Are you sure you want to permanently delete this savings goal? This action cannot be undone.
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
