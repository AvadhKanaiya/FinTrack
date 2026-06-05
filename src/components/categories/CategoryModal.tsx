'use client'

import { useState, useRef, useEffect } from 'react'
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
import { Plus, Loader2, Smile } from 'lucide-react'
import { createCategory } from '@/app/actions'
import { toast } from 'sonner'

// ── Tailwind color palette ──────────────────────────────────────────────────
export const COLOR_PALETTE = [
  { name: 'Indigo',    hex: '#6366f1' },
  { name: 'Violet',   hex: '#8b5cf6' },
  { name: 'Purple',   hex: '#a855f7' },
  { name: 'Pink',     hex: '#ec4899' },
  { name: 'Rose',     hex: '#f43f5e' },
  { name: 'Red',      hex: '#ef4444' },
  { name: 'Orange',   hex: '#f97316' },
  { name: 'Amber',    hex: '#f59e0b' },
  { name: 'Yellow',   hex: '#eab308' },
  { name: 'Lime',     hex: '#84cc16' },
  { name: 'Green',    hex: '#22c55e' },
  { name: 'Emerald',  hex: '#10b981' },
  { name: 'Teal',     hex: '#14b8a6' },
  { name: 'Cyan',     hex: '#06b6d4' },
  { name: 'Sky',      hex: '#0ea5e9' },
  { name: 'Blue',     hex: '#3b82f6' },
  { name: 'Slate',    hex: '#64748b' },
  { name: 'Zinc',     hex: '#71717a' },
]

// ── Curated emoji list ──────────────────────────────────────────────────────
const EMOJI_GROUPS = [
  {
    label: 'Finance',
    emojis: ['💰', '💵', '💳', '🏦', '📈', '📉', '💸', '🪙', '💎', '🧾'],
  },
  {
    label: 'Food',
    emojis: ['🍔', '🍕', '☕', '🛒', '🍜', '🥗', '🍱', '🥤', '🍰', '🥘'],
  },
  {
    label: 'Travel',
    emojis: ['✈️', '🚗', '🚂', '🚢', '🏨', '🗺️', '⛽', '🧳', '🚕', '🛵'],
  },
  {
    label: 'Home & Life',
    emojis: ['🏠', '🏡', '💡', '🛁', '🛋️', '🔧', '🧹', '📦', '🪴', '🔑'],
  },
  {
    label: 'Health',
    emojis: ['🏥', '💊', '🩺', '🧘', '🏋️', '🧬', '💆', '🌡️', '🦷', '👓'],
  },
  {
    label: 'Work & Education',
    emojis: ['💼', '💻', '📚', '🎓', '📝', '🖥️', '📊', '🗂️', '🖊️', '🏢'],
  },
  {
    label: 'Entertainment',
    emojis: ['🎬', '🎮', '🎵', '📺', '🎭', '🎨', '📱', '🎤', '🎧', '🎲'],
  },
  {
    label: 'Shopping',
    emojis: ['🛍️', '👗', '👟', '💅', '💄', '⌚', '🎁', '🧴', '👜', '🕶️'],
  },
  {
    label: 'Income',
    emojis: ['💼', '🤝', '🏆', '⭐', '🎯', '🚀', '🌱', '💪', '🎁', '🔖'],
  },
]

const initialState = { error: undefined as string | undefined, success: false }

interface CategoryModalProps {
  onCreated?: () => void
}

export function CategoryModal({ onCreated }: CategoryModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>('expense')
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex)
  const [selectedEmoji, setSelectedEmoji] = useState('📦')
  const [customEmoji, setCustomEmoji] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialState, formData: FormData) => {
      formData.set('type', selectedType ?? 'expense')
      formData.set('color', selectedColor)
      formData.set('icon', customEmoji || selectedEmoji)
      const result = await createCategory(formData)
      return result as typeof initialState
    },
    initialState
  )

  useEffect(() => {
    if (state?.success) {
      toast.success('Category created!')
      setOpen(false)
      formRef.current?.reset()
      setSelectedEmoji('📦')
      setCustomEmoji('')
      setSelectedColor(COLOR_PALETTE[0].hex)
      setSelectedType('expense')
      onCreated?.()
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const displayEmoji = customEmoji || selectedEmoji

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Add a personal category to organize your transactions.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction}>
          <div className="grid gap-5 py-4">

            {/* Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-sm flex-shrink-0"
                style={{ backgroundColor: selectedColor + '22', border: `2px solid ${selectedColor}33` }}
              >
                {displayEmoji}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Preview</p>
                <p className="font-semibold text-sm">Your new category</p>
              </div>
              <div
                className="ml-auto h-4 w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
            </div>

            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-sm">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Gym Membership"
                className="col-span-3"
                required
              />
            </div>

            {/* Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm">Type</Label>
              <div className="col-span-3">
                <Select value={selectedType ?? 'expense'} onValueChange={(v) => setSelectedType(v)}>
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

            {/* Emoji Picker */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right text-sm pt-2">Icon</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-transparent text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-lg">{displayEmoji}</span>
                    <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Pick emoji</span>
                  </button>
                  <Input
                    placeholder="or type any emoji..."
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    className="flex-1 text-lg"
                    maxLength={4}
                  />
                </div>

                {showEmojiPicker && (
                  <div className="rounded-xl border bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
                    {/* Group tabs */}
                    <div className="flex overflow-x-auto border-b scrollbar-none">
                      {EMOJI_GROUPS.map((group, i) => (
                        <button
                          key={group.label}
                          type="button"
                          onClick={() => setActiveEmojiGroup(i)}
                          className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                            activeEmojiGroup === i
                              ? 'border-b-2 border-indigo-600 text-indigo-600'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                    {/* Emojis grid */}
                    <div className="grid grid-cols-10 gap-0.5 p-2">
                      {EMOJI_GROUPS[activeEmojiGroup].emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setSelectedEmoji(emoji)
                            setCustomEmoji('')
                            setShowEmojiPicker(false)
                          }}
                          className={`text-xl p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                            selectedEmoji === emoji && !customEmoji ? 'bg-indigo-50 dark:bg-indigo-950' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Color Palette */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right text-sm pt-2">Color</Label>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      title={color.name}
                      onClick={() => setSelectedColor(color.hex)}
                      className="h-7 w-7 rounded-full transition-all hover:scale-110 focus:outline-none"
                      style={{
                        backgroundColor: color.hex,
                        boxShadow: selectedColor === color.hex
                          ? `0 0 0 2px white, 0 0 0 4px ${color.hex}`
                          : 'none',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: <span className="font-medium" style={{ color: selectedColor }}>{COLOR_PALETTE.find(c => c.hex === selectedColor)?.name || selectedColor}</span>
                </p>
              </div>
            </div>

          </div>

          {state?.error && (
            <p className="text-sm text-red-500 mb-4 px-1">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={pending}
            >
              {pending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
