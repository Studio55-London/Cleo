import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ListTodo, Repeat, Clock } from 'lucide-react'
import type { TaskTemplate, Space, ApplyTemplateInput } from '@/types'

interface ApplyTemplateModalProps {
  open: boolean
  template: TaskTemplate | null
  onClose: () => void
  onApply: (templateId: number, input: ApplyTemplateInput) => Promise<void>
  spaces: Space[]
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([^}]+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(1, -1)))]
}

export function ApplyTemplateModal({
  open,
  template,
  onClose,
  onApply,
  spaces,
}: ApplyTemplateModalProps) {
  const [spaceId, setSpaceId] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [titleVars, setTitleVars] = useState<Record<string, string>>({})
  const [descriptionVars, setDescriptionVars] = useState<Record<string, string>>({})
  const [createSubtasks, setCreateSubtasks] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const titlePlaceholders = useMemo(() => {
    if (!template) return []
    return extractPlaceholders(template.title_template)
  }, [template])

  const descriptionPlaceholders = useMemo(() => {
    if (!template?.description_template) return []
    return extractPlaceholders(template.description_template)
  }, [template])

  const allPlaceholders = useMemo(() => {
    return [...new Set([...titlePlaceholders, ...descriptionPlaceholders])]
  }, [titlePlaceholders, descriptionPlaceholders])

  useEffect(() => {
    if (open && template) {
      const initialVars: Record<string, string> = {}
      allPlaceholders.forEach((p) => {
        initialVars[p] = ''
      })
      setTitleVars(initialVars)
      setDescriptionVars(initialVars)
      setSpaceId('')
      setDueDate('')
      setCreateSubtasks(true)
    }
  }, [open, template, allPlaceholders])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!template || !spaceId) return

    setIsSubmitting(true)
    try {
      await onApply(template.id, {
        space_id: parseInt(spaceId),
        title_vars: Object.keys(titleVars).length > 0 ? titleVars : undefined,
        description_vars:
          Object.keys(descriptionVars).length > 0 ? descriptionVars : undefined,
        due_date: dueDate || undefined,
        create_subtasks: createSubtasks,
      })

      handleClose()
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSpaceId('')
    setDueDate('')
    setTitleVars({})
    setDescriptionVars({})
    setCreateSubtasks(true)
    onClose()
  }

  const handleVarChange = (key: string, value: string) => {
    setTitleVars((prev) => ({ ...prev, [key]: value }))
    setDescriptionVars((prev) => ({ ...prev, [key]: value }))
  }

  if (!template) return null

  const subtaskCount = template.subtask_templates?.length || 0
  const hasRecurrence = !!template.default_recurrence_type

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Use Template: {template.name}</DialogTitle>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{template.default_priority} priority</Badge>
            {subtaskCount > 0 && (
              <Badge variant="secondary">
                <ListTodo className="h-3 w-3 mr-1" />
                {subtaskCount} subtasks
              </Badge>
            )}
            {hasRecurrence && (
              <Badge variant="secondary">
                <Repeat className="h-3 w-3 mr-1" />
                {template.default_recurrence_type}
              </Badge>
            )}
            {template.default_due_offset_days && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Due in {template.default_due_offset_days} days
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="space">Space *</Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger id="space">
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {allPlaceholders.length > 0 && (
            <div className="space-y-4">
              <Label>Fill in template variables</Label>
              {allPlaceholders.map((placeholder) => (
                <div key={placeholder} className="space-y-1">
                  <Label htmlFor={placeholder} className="text-sm text-muted-foreground">
                    {placeholder}
                  </Label>
                  <Input
                    id={placeholder}
                    placeholder={`Enter ${placeholder}...`}
                    value={titleVars[placeholder] || ''}
                    onChange={(e) => handleVarChange(placeholder, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date (optional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {template.default_due_offset_days && !dueDate && (
              <p className="text-xs text-muted-foreground">
                Will default to {template.default_due_offset_days} days from now
              </p>
            )}
          </div>

          {subtaskCount > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-subtasks"
                checked={createSubtasks}
                onChange={(e) => setCreateSubtasks(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="create-subtasks" className="text-sm font-normal">
                Create {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''} from template
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !spaceId}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
