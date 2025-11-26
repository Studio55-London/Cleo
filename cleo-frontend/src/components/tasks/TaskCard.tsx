import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Repeat,
  ListTodo,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority, TaskStatus, CreateSubtaskInput } from '@/types'

interface TaskCardProps {
  task: Task
  onComplete: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange?: (task: Task, status: TaskStatus) => void
  onAddSubtask?: (parentTaskId: number, data: CreateSubtaskInput) => Promise<void>
  onCompleteSubtask?: (subtask: Task) => void
  isSubtask?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const statusIcons: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
}

function formatDueDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays} days`
  return date.toLocaleDateString()
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date) < new Date()
}

function getRecurrenceLabel(task: Task): string | null {
  if (!task.recurrence_type) return null
  const interval = task.recurrence_interval || 1
  switch (task.recurrence_type) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`
    case 'weekly':
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`
    case 'monthly':
      return interval === 1 ? 'Monthly' : `Every ${interval} months`
    default:
      return null
  }
}

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onStatusChange,
  onAddSubtask,
  onCompleteSubtask,
  isSubtask = false,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false)

  const StatusIcon = statusIcons[task.status]
  const dueDateText = formatDueDate(task.due_date)
  const overdue = isOverdue(task)
  const recurrenceLabel = getRecurrenceLabel(task)
  const hasSubtasks = task.subtask_count > 0
  const subtaskProgress = hasSubtasks
    ? Math.round((task.completed_subtask_count / task.subtask_count) * 100)
    : 0

  const handleStatusClick = () => {
    if (task.status === 'completed') return
    if (task.status === 'todo' && onStatusChange) {
      onStatusChange(task, 'in_progress')
    } else if (task.status === 'in_progress') {
      onComplete(task)
    } else {
      onComplete(task)
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !onAddSubtask) return

    setIsSubmittingSubtask(true)
    try {
      await onAddSubtask(task.id, { title: newSubtaskTitle.trim() })
      setNewSubtaskTitle('')
      setIsAddingSubtask(false)
    } catch (error) {
      console.error('Failed to add subtask:', error)
    } finally {
      setIsSubmittingSubtask(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddSubtask()
    } else if (e.key === 'Escape') {
      setIsAddingSubtask(false)
      setNewSubtaskTitle('')
    }
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        task.status === 'completed' && 'opacity-60',
        overdue && 'border-red-500/50',
        isSubtask && 'border-l-2 border-l-primary/30'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className={cn('p-4', isSubtask && 'p-3')}>
        <div className="flex items-start gap-3">
          {/* Expand/Collapse for tasks with subtasks */}
          {hasSubtasks && !isSubtask ? (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          ) : null}

          <button
            onClick={handleStatusClick}
            className={cn(
              'mt-0.5 flex-shrink-0 transition-colors',
              task.status === 'completed'
                ? 'text-green-500'
                : task.status === 'in_progress'
                ? 'text-blue-500 hover:text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <StatusIcon className={cn('h-5 w-5', isSubtask && 'h-4 w-4')} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  'font-medium leading-tight',
                  isSubtask ? 'text-xs' : 'text-sm',
                  task.status === 'completed' && 'line-through text-muted-foreground'
                )}
              >
                {task.title}
              </h3>

              <div
                className={cn(
                  'flex items-center gap-1 flex-shrink-0 transition-opacity',
                  isHovered ? 'opacity-100' : 'opacity-0'
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {!isSubtask && onAddSubtask && (
                      <DropdownMenuItem onClick={() => setIsAddingSubtask(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subtask
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete(task)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {task.description && !isSubtask && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge
                variant="outline"
                className={cn('text-xs', priorityColors[task.priority])}
              >
                {task.priority}
              </Badge>

              {task.space_name && !isSubtask && (
                <Badge variant="secondary" className="text-xs">
                  {task.space_name}
                </Badge>
              )}

              {recurrenceLabel && (
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <Repeat className="h-3 w-3" />
                  {recurrenceLabel}
                </span>
              )}

              {hasSubtasks && !isSubtask && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListTodo className="h-3 w-3" />
                  {task.completed_subtask_count}/{task.subtask_count}
                </span>
              )}

              {dueDateText && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    overdue ? 'text-red-500' : 'text-muted-foreground'
                  )}
                >
                  {overdue ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <CalendarDays className="h-3 w-3" />
                  )}
                  {dueDateText}
                </span>
              )}
            </div>

            {/* Subtask progress bar */}
            {hasSubtasks && !isSubtask && (
              <div className="mt-3">
                <Progress value={subtaskProgress} className="h-1.5" />
              </div>
            )}
          </div>
        </div>

        {/* Subtasks section */}
        {hasSubtasks && !isSubtask && isExpanded && task.subtasks && (
          <div className="mt-4 ml-8 space-y-2">
            {task.subtasks.map((subtask) => (
              <TaskCard
                key={subtask.id}
                task={subtask}
                onComplete={onCompleteSubtask || onComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                isSubtask
              />
            ))}
          </div>
        )}

        {/* Add subtask inline form */}
        {isAddingSubtask && !isSubtask && (
          <div className="mt-4 ml-8 flex items-center gap-2">
            <Input
              placeholder="Enter subtask title..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm h-8"
              autoFocus
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim() || isSubmittingSubtask}
            >
              {isSubmittingSubtask ? 'Adding...' : 'Add'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setIsAddingSubtask(false)
                setNewSubtaskTitle('')
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
