import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Repeat } from 'lucide-react'
import { useSpaces } from '@/api'
import type { CreateTaskInput, TaskPriority, RecurrenceType } from '@/types'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateTaskInput) => Promise<void>
  defaultSpaceId?: number
}

export function CreateTaskModal({
  open,
  onOpenChange,
  onCreate,
  defaultSpaceId,
}: CreateTaskModalProps) {
  const { data: spaces } = useSpaces()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [formData, setFormData] = useState<{
    space_id: string
    title: string
    description: string
    priority: TaskPriority
    due_date: string
    recurrence_type: RecurrenceType
    recurrence_interval: number
    recurrence_days: number[]
    recurrence_end_date: string
  }>({
    space_id: defaultSpaceId?.toString() || '',
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    recurrence_type: null,
    recurrence_interval: 1,
    recurrence_days: [],
    recurrence_end_date: '',
  })

  const toggleRecurrenceDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day].sort(),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.space_id || !formData.title.trim()) return

    setIsSubmitting(true)
    try {
      await onCreate({
        space_id: parseInt(formData.space_id),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        recurrence_type: formData.recurrence_type || undefined,
        recurrence_interval: formData.recurrence_type ? formData.recurrence_interval : undefined,
        recurrence_days: formData.recurrence_type === 'weekly' && formData.recurrence_days.length > 0
          ? formData.recurrence_days
          : undefined,
        recurrence_end_date: formData.recurrence_type && formData.recurrence_end_date
          ? formData.recurrence_end_date
          : undefined,
      })
      setFormData({
        space_id: defaultSpaceId?.toString() || '',
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        recurrence_type: null,
        recurrence_interval: 1,
        recurrence_days: [],
        recurrence_end_date: '',
      })
      setShowRecurrence(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to track your work
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add a description..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="space">Space *</Label>
                <Select
                  value={formData.space_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, space_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a space" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces?.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TaskPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>

            {/* Recurrence Section */}
            <Collapsible open={showRecurrence} onOpenChange={setShowRecurrence}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Repeat className="h-4 w-4" />
                    {formData.recurrence_type
                      ? `Repeats ${formData.recurrence_type}`
                      : 'Add Recurrence'}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showRecurrence ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid gap-2">
                  <Label>Repeat</Label>
                  <Select
                    value={formData.recurrence_type || 'none'}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        recurrence_type: v === 'none' ? null : (v as RecurrenceType),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence_type && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="interval">Every</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="interval"
                          type="number"
                          min="1"
                          max="99"
                          value={formData.recurrence_interval}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              recurrence_interval: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                          {formData.recurrence_type === 'daily'
                            ? formData.recurrence_interval === 1
                              ? 'day'
                              : 'days'
                            : formData.recurrence_type === 'weekly'
                            ? formData.recurrence_interval === 1
                              ? 'week'
                              : 'weeks'
                            : formData.recurrence_interval === 1
                            ? 'month'
                            : 'months'}
                        </span>
                      </div>
                    </div>

                    {formData.recurrence_type === 'weekly' && (
                      <div className="grid gap-2">
                        <Label>On Days</Label>
                        <div className="flex flex-wrap gap-1">
                          {DAYS_OF_WEEK.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={
                                formData.recurrence_days.includes(day.value)
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              className="w-10 h-8 text-xs"
                              onClick={() => toggleRecurrenceDay(day.value)}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="end_date">End Date (Optional)</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.recurrence_end_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            recurrence_end_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.space_id || !formData.title.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
