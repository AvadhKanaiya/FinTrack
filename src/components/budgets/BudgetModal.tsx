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
import { Plus, Loader2 } from 'lucide-react'
import { createBudget } from '@/app/actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  type: string
  icon: string | null
  color: string | null
  user_id: string | null
}

const initialState = { error: undefined as string | undefined, success: false }

export function BudgetModal() {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('category_id', selectedCategory ?? '')
      const result = await createBudget(formData)
      return result as typeof initialState
    },
    initialState
  )

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('categories')
        .select('id, name, type, icon, color, user_id')
        .eq('type', 'expense')
        .order('name')
      if (data) {
        setCategories([
          ...data.filter(c => c.user_id === null),
          ...data.filter(c => c.user_id !== null),
        ])
      }
    }
    if (open) fetchCategories()
  }, [open])

  useEffect(() => {
    if (state?.success) {
      toast.success('Budget created successfully!')
      setOpen(false)
      formRef.current?.reset()
      setSelectedCategory(null)
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const selectedCat = categories.find(c => c.id === selectedCategory)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Category */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Category</Label>
              <div className="col-span-3">
                <Select
                  value={selectedCategory ?? undefined}
                  onValueChange={(v) => setSelectedCategory(v)}
                >
                  <SelectTrigger className="w-full">
                    {selectedCat ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-sm flex-shrink-0"
                          style={{
                            backgroundColor: (selectedCat.color || '#6366f1') + '22',
                            border: `1.5px solid ${selectedCat.color || '#6366f1'}44`,
                          }}
                        >
                          {selectedCat.icon || '📦'}
                        </span>
                        <span>{selectedCat.name}</span>
                      </span>
                    ) : (
                      <SelectValue
                        placeholder={
                          categories.length === 0 ? 'No expense categories yet' : 'Select category'
                        }
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No categories available
                      </SelectItem>
                    ) : (
                      categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2 w-full">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-md text-sm flex-shrink-0"
                              style={{
                                backgroundColor: (cat.color || '#6366f1') + '22',
                                border: `1.5px solid ${cat.color || '#6366f1'}44`,
                              }}
                            >
                              {cat.icon || '📦'}
                            </span>
                            <span>{cat.name}</span>
                            <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              cat.user_id === null
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-500'
                            }`}>
                              {cat.user_id === null ? 'System' : 'Custom'}
                            </span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Monthly Limit */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="monthly_limit" className="text-right">
                Monthly Limit
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="monthly_limit"
                  name="monthly_limit"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="500.00"
                  className="pl-7"
                  required
                />
              </div>
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
              disabled={pending || !selectedCategory}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Budget'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
