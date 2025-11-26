import { useState } from 'react'
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
  Clock,
  ListTodo,
  Repeat,
  Folder,
  Globe,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { TaskTemplate, TaskPriority } from '@/types'

interface TemplateCardProps {
  template: TaskTemplate
  onApply: (template: TaskTemplate) => void
  onEdit?: (template: TaskTemplate) => void
  onDuplicate?: (template: TaskTemplate) => void
  onDelete?: (template: TaskTemplate) => void
  compact?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const categoryColors: Record<string, string> = {
  meetings: 'bg-purple-500/10 text-purple-500',
  planning: 'bg-blue-500/10 text-blue-500',
  development: 'bg-green-500/10 text-green-500',
  work: 'bg-orange-500/10 text-orange-500',
  personal: 'bg-pink-500/10 text-pink-500',
  project: 'bg-cyan-500/10 text-cyan-500',
}

export function TemplateCard({
  template,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  compact = false,
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const subtaskCount = template.subtask_templates?.length || 0
  const hasRecurrence = !!template.default_recurrence_type
  const hasDueOffset = !!template.default_due_offset_days

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        !template.is_active && 'opacity-60'
      )}
      style={template.color ? { borderLeftColor: template.color, borderLeftWidth: '3px' } : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onApply(template)}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start gap-3">
          {template.icon && (
            <div className="mt-0.5 flex-shrink-0 text-2xl">
              {template.icon}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3
                  className={cn(
                    'font-medium leading-tight',
                    compact ? 'text-xs' : 'text-sm'
                  )}
                >
                  {template.name}
                </h3>
                {template.description && !compact && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>

              <div
                className={cn(
                  'flex items-center gap-1 flex-shrink-0 transition-opacity',
                  isHovered ? 'opacity-100' : 'opacity-0'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onApply(template)}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Use
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onApply(template)}>
                      <Play className="h-4 w-4 mr-2" />
                      Use Template
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(template)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDuplicate && (
                      <DropdownMenuItem onClick={() => onDuplicate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(template)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn('text-xs', priorityColors[template.default_priority])}
              >
                {template.default_priority}
              </Badge>

              {template.category && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    categoryColors[template.category] || 'bg-gray-500/10 text-gray-500'
                  )}
                >
                  <Folder className="h-3 w-3 mr-1" />
                  {template.category}
                </Badge>
              )}

              {template.is_global && (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Global
                </Badge>
              )}

              {subtaskCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListTodo className="h-3 w-3" />
                  {subtaskCount} subtasks
                </span>
              )}

              {hasRecurrence && (
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <Repeat className="h-3 w-3" />
                  {template.default_recurrence_type}
                </span>
              )}

              {hasDueOffset && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {template.default_due_offset_days}d
                </span>
              )}
            </div>

            {template.use_count > 0 && !compact && (
              <p className="text-xs text-muted-foreground mt-2">
                Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
