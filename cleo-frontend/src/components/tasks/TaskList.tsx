import { TaskCard } from './TaskCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListTodo } from 'lucide-react'
import type { Task, TaskStatus, CreateSubtaskInput } from '@/types'

interface TaskListProps {
  tasks: Task[] | undefined
  isLoading: boolean
  onComplete: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange?: (task: Task, status: TaskStatus) => void
  onAddSubtask?: (parentTaskId: number, data: CreateSubtaskInput) => Promise<void>
  onCompleteSubtask?: (subtask: Task) => void
  emptyMessage?: string
}

export function TaskList({
  tasks,
  isLoading,
  onComplete,
  onEdit,
  onDelete,
  onStatusChange,
  onAddSubtask,
  onCompleteSubtask,
  emptyMessage = 'No tasks found',
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ListTodo className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{emptyMessage}</p>
        <p className="text-sm">Create a task to get started</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onAddSubtask={onAddSubtask}
            onCompleteSubtask={onCompleteSubtask}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
