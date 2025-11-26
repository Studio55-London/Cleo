import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ListTodo, Plus, Circle, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/api/hooks/useTasks'
import type { Task } from '@/types'

type FilterType = 'all' | 'todo' | 'in_progress' | 'completed'

const filters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Done' },
]

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
}

const statusColors = {
  todo: 'text-foreground-tertiary',
  in_progress: 'text-warning',
  completed: 'text-success',
}

export function TasksPanel() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const { data: tasks = [], isLoading } = useTasks()

  const filteredTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter((task: Task) => task.status === activeFilter)

  const taskCounts = {
    todo: tasks.filter((t: Task) => t.status === 'todo').length,
    in_progress: tasks.filter((t: Task) => t.status === 'in_progress').length,
    completed: tasks.filter((t: Task) => t.status === 'completed').length,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Task Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
          My Tasks
        </h3>
        <Button size="sm" asChild>
          <Link to="/tasks">
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Link>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter(filter.value)}
            className="flex-1 text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-around px-4 py-3 border-b border-border bg-background-secondary">
        <div className="text-center">
          <p className="text-lg font-semibold">{taskCounts.todo}</p>
          <p className="text-xs text-foreground-tertiary">To Do</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-warning">{taskCounts.in_progress}</p>
          <p className="text-xs text-foreground-tertiary">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-success">{taskCounts.completed}</p>
          <p className="text-xs text-foreground-tertiary">Done</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <p className="text-sm text-foreground-secondary text-center py-4">Loading...</p>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">
              {activeFilter === 'all' ? 'No tasks yet' : `No ${activeFilter.replace('_', ' ')} tasks`}
            </p>
            <p className="text-xs text-foreground-tertiary mt-1">
              Select a space to see tasks
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task: Task) => {
              const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Circle
              const statusColor = statusColors[task.status as keyof typeof statusColors] || 'text-foreground-tertiary'

              return (
                <Link
                  key={task.id}
                  to="/tasks"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background-hover transition-colors"
                >
                  <StatusIcon className={cn('h-5 w-5 mt-0.5 shrink-0', statusColor)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      task.status === 'completed' && 'line-through text-foreground-tertiary'
                    )}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-xs text-foreground-tertiary mt-0.5">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
