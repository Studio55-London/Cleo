import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TaskStats as TaskStatsType } from '@/types'
import { CheckCircle2, Circle, Clock, ListTodo } from 'lucide-react'

interface TaskStatsProps {
  stats: TaskStatsType | undefined
  isLoading: boolean
}

export function TaskStats({ stats, isLoading }: TaskStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Total',
      value: stats?.total ?? 0,
      icon: ListTodo,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: 'To Do',
      value: stats?.todo ?? 0,
      icon: Circle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: 'In Progress',
      value: stats?.in_progress ?? 0,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Completed',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', item.bgColor)}>
                <item.icon className={cn('h-5 w-5', item.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
