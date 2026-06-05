'use client'

import { useState, useTransition } from 'react'
import { Trash2, Lock } from 'lucide-react'
import { deleteCategory } from '@/app/actions'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  user_id: string | null
}

interface CategoryCardProps {
  category: Category
  isSystem: boolean
}

export function CategoryCard({ category, isSystem }: CategoryCardProps) {
  const [isPending, startTransition] = useTransition()
  const [deleted, setDeleted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = category.color || '#6366f1'

  if (deleted) return null

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCategory(category.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`"${category.name}" deleted`)
        setDeleted(true)
      }
    })
  }

  if (confirmDelete) {
    return (
      <div className="relative flex flex-col items-center justify-between gap-1.5 rounded-xl p-3 text-center border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 h-full min-h-[120px] animate-in fade-in zoom-in-95 duration-150 w-full">
        <div className="flex flex-col items-center gap-1 mt-1">
          <Trash2 className="h-4 w-4 text-red-500 animate-bounce" />
          <p className="text-[10px] font-semibold text-red-800 dark:text-red-300 leading-tight line-clamp-2">
            Delete "{category.name}"?
          </p>
          <p className="text-[9px] text-red-600/80 dark:text-red-400/80 leading-tight">
            Cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 w-full mt-1.5">
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={isPending}
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-1 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            No
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 py-1 text-[10px] font-semibold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
          >
            {isPending ? (
              <div className="h-2 w-2 border border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Yes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all duration-200 ${
        isSystem
          ? 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800'
          : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md'
      }`}
    >
      {/* System lock / delete button */}
      {isSystem ? (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800" title="System category — cannot be deleted">
            <Lock className="h-3 w-3 text-zinc-400" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={isPending}
          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-all"
          title="Delete category"
        >
          {isPending ? (
            <div className="h-3 w-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Icon circle */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl flex-shrink-0"
        style={{
          backgroundColor: color + '1a',
          border: `1.5px solid ${color}33`,
        }}
      >
        {category.icon || '📦'}
      </div>

      {/* Name */}
      <p className="text-xs font-medium leading-tight text-zinc-700 dark:text-zinc-300 line-clamp-2">
        {category.name}
      </p>

      {/* Badge */}
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: color + '1a',
          color: color,
        }}
      >
        {isSystem ? 'System' : 'Custom'}
      </span>
    </div>
  )
}
