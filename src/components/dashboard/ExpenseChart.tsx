'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

interface ExpenseChartProps {
  data: { name: string; total: number }[]
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const { formatAmount } = useUserPreferences()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card className="col-span-4 border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Spending Overview</CardTitle>
        <CardDescription>Your expenses over the last months</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          {!mounted ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Loading chart...
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800 opacity-50" />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={10}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatAmount(value, true, 0)}
                  tickMargin={10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(24, 24, 27, 0.8)', 
                    borderRadius: '8px', 
                    border: 'none',
                    color: '#fff',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                  }} 
                  formatter={(value) => [formatAmount(Number(value)), 'Total Spent']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No expense data available for the chart.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
