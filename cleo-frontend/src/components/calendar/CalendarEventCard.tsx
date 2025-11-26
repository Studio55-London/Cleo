import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Bell,
  Repeat,
  CheckSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { CalendarEvent, CalendarEventType } from '@/types'

interface CalendarEventCardProps {
  event: CalendarEvent
  onEdit: (event: CalendarEvent) => void
  onDelete: (event: CalendarEvent) => void
  compact?: boolean
}

const eventTypeColors: Record<CalendarEventType, string> = {
  event: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  meeting: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  deadline: 'bg-red-500/10 text-red-500 border-red-500/20',
  reminder: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  block: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const eventTypeIcons: Record<CalendarEventType, typeof Calendar> = {
  event: Calendar,
  meeting: Users,
  deadline: CheckSquare,
  reminder: Bell,
  block: Clock,
}

function formatEventTime(event: CalendarEvent): string {
  if (event.all_day) return 'All day'
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${startTime} - ${endTime}`
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function CalendarEventCard({
  event,
  onEdit,
  onDelete,
  compact = false,
}: CalendarEventCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const EventIcon = eventTypeIcons[event.event_type]
  const isPast = new Date(event.end_time) < new Date()
  const hasAttendees = event.attendees && event.attendees.length > 0

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isPast && 'opacity-60',
        event.status === 'cancelled' && 'opacity-40 line-through'
      )}
      style={event.color ? { borderLeftColor: event.color, borderLeftWidth: '3px' } : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex-shrink-0 p-2 rounded-md',
              eventTypeColors[event.event_type]
            )}
          >
            <EventIcon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  'font-medium leading-tight',
                  compact ? 'text-xs' : 'text-sm',
                  event.status === 'cancelled' && 'line-through text-muted-foreground'
                )}
              >
                {event.title}
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
                    <DropdownMenuItem onClick={() => onEdit(event)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(event)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {event.description && !compact && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn('text-xs', eventTypeColors[event.event_type])}
              >
                {event.event_type}
              </Badge>

              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatEventTime(event)}
              </span>

              {!compact && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatEventDate(event.start_time)}
                </span>
              )}

              {event.location && !compact && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}

              {event.is_recurring && (
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <Repeat className="h-3 w-3" />
                  Recurring
                </span>
              )}

              {hasAttendees && !compact && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {event.attendees.length}
                </span>
              )}

              {event.task && !compact && (
                <Badge variant="secondary" className="text-xs">
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Linked Task
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
