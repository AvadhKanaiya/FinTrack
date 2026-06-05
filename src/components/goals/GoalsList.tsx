'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EditGoalModal } from '@/components/goals/GoalModal'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

interface Goal {
  id: string
  title: string
  current_amount: number
  target_amount: number
  deadline: string | null
  icon: string | null
}

interface GoalsListProps {
  goals: Goal[]
}

export function GoalsList({ goals }: GoalsListProps) {
  const { formatDate, formatAmount } = useUserPreferences()

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {goals && goals.length > 0 ? (
        goals.map((goal) => {
          const current = Number(goal.current_amount)
          const target = Number(goal.target_amount)
          const percentage = Math.min((current / target) * 100, 100)
          const isCompleted = current >= target
          const remaining = target - current
          const icon = goal.icon || '🎯'

          return (
            <Card
              key={goal.id}
              className={`border-none shadow-md backdrop-blur-xl ${
                isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/20'
                  : 'bg-white/50 dark:bg-zinc-900/50'
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-sm flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : 'bg-indigo-50 dark:bg-indigo-950/40'
                    }`}
                  >
                    {icon}
                  </div>
                  <div className="space-y-0.5">
                    <CardTitle className="text-xl">{goal.title}</CardTitle>
                    <CardDescription>
                      {isCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          🎉 Goal Completed!
                        </span>
                      ) : goal.deadline ? (
                        `Due ${formatDate(goal.deadline)}`
                      ) : (
                        'In Progress'
                      )}
                    </CardDescription>
                  </div>
                </div>
                <EditGoalModal
                  goal={{
                    id: goal.id,
                    title: goal.title,
                    target_amount: target,
                    current_amount: current,
                    deadline: goal.deadline,
                    icon: goal.icon,
                  }}
                />
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="text-2xl font-bold">
                      {formatAmount(current)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of {formatAmount(target)}
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-3 ${isCompleted ? '[&_[data-slot=progress-indicator]]:bg-emerald-500' : '[&_[data-slot=progress-indicator]]:bg-indigo-500'}`}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground font-medium">
                      {isCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Fully funded ✓</span>
                      ) : (
                        <span>{formatAmount(remaining)} to go</span>
                      )}
                    </p>
                    <p className="text-sm font-semibold text-right">
                      {percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <div className="text-5xl">🎯</div>
          <div>
            <p className="font-medium text-foreground">No savings goals yet</p>
            <p className="text-sm mt-1">Click &quot;New Goal&quot; to set your first savings target.</p>
          </div>
        </div>
      )}
    </div>
  )
}
