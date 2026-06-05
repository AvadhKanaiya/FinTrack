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
import { createTransaction, updateTransaction, deleteTransaction } from '@/app/actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  type: string
  icon: string | null
  color: string | null
  user_id: string | null
}

interface Transaction {
  id: string
  type: string
  amount: number
  title: string
  category_id: string | null
  transaction_date: string
  note: string | null
}

const initialState = { error: undefined as string | undefined, success: false }

// ─── Add Transaction button + modal ────────────────────────────────────────
export function TransactionModal() {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedType, setSelectedType] = useState('expense')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('type', selectedType)
      formData.set('category_id', selectedCategory ?? '')
      const result = await createTransaction(formData)
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
      toast.success('Transaction added successfully!')
      setOpen(false)
      formRef.current?.reset()
      setSelectedType('expense')
      setSelectedCategory(null)
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const filteredCategories = categories.filter(c => c.type === selectedType)
  const selectedCat = categories.find(c => c.id === selectedCategory)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Enter your transaction details below.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3">
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v ?? 'expense')
                    setSelectedCategory(null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-amount" className="text-right">Amount</Label>
              <Input
                id="add-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="col-span-3"
                required
              />
            </div>

            {/* Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-title" className="text-right">Title</Label>
              <Input
                id="add-title"
                name="title"
                placeholder="Coffee, Salary, etc."
                className="col-span-3"
                required
              />
            </div>

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
                          categories.length === 0 ? 'No categories yet' : 'Select category'
                        }
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No categories available
                      </SelectItem>
                    ) : (
                      filteredCategories.map((cat) => (
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

            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-date" className="text-right">Date</Label>
              <Input
                id="add-date"
                name="date"
                type="date"
                className="col-span-3"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Note */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-note" className="text-right">Note</Label>
              <Input
                id="add-note"
                name="note"
                placeholder="Optional note..."
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
                  Saving...
                </>
              ) : (
                'Add Transaction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Transaction button + modal ───────────────────────────────────────
export function EditTransactionModal({ transaction }: { transaction: Transaction }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedType, setSelectedType] = useState(transaction.type)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(transaction.category_id)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('type', selectedType)
      formData.set('category_id', selectedCategory ?? '')
      const result = await updateTransaction(transaction.id, formData)
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
        .order('name')
      if (data) {
        setCategories([
          ...data.filter(c => c.user_id === null),
          ...data.filter(c => c.user_id !== null),
        ])
      }
    }
    if (open) {
      fetchCategories()
      setSelectedType(transaction.type)
      setSelectedCategory(transaction.category_id)
      setShowConfirmDelete(false)
    }
  }, [open, transaction])

  useEffect(() => {
    if (!open) {
      setShowConfirmDelete(false)
    }
  }, [open])

  useEffect(() => {
    if (state?.success) {
      toast.success('Transaction updated!')
      setOpen(false)
      router.refresh()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteTransaction(transaction.id)
    if (result?.error) {
      toast.error(result.error)
      setDeleting(false)
    } else {
      toast.success('Transaction deleted')
      setOpen(false)
      router.refresh()
    }
  }

  const filteredCategories = categories.filter(c => c.type === selectedType)
  const selectedCat = categories.find(c => c.id === selectedCategory)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
            title="Edit transaction"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update your transaction details.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <div className="grid gap-4 py-4">
            {/* Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3">
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v ?? 'expense')
                    setSelectedCategory(null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-amount" className="text-right">Amount</Label>
              <Input
                id="edit-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={transaction.amount}
                className="col-span-3"
                required
              />
            </div>

            {/* Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">Title</Label>
              <Input
                id="edit-title"
                name="title"
                defaultValue={transaction.title}
                className="col-span-3"
                required
              />
            </div>

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
                      <SelectValue placeholder="Select category" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No categories available
                      </SelectItem>
                    ) : (
                      filteredCategories.map((cat) => (
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

            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right">Date</Label>
              <Input
                id="edit-date"
                name="date"
                type="date"
                defaultValue={transaction.transaction_date}
                className="col-span-3"
                required
              />
            </div>

            {/* Note */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-note" className="text-right">Note</Label>
              <Input
                id="edit-note"
                name="note"
                defaultValue={transaction.note ?? ''}
                placeholder="Optional note..."
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
                    Delete transaction?
                  </p>
                  <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5">
                    Are you sure you want to permanently delete this transaction? This action cannot be undone.
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
