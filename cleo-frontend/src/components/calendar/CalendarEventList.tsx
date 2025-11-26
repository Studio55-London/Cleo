import { useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarEventCard } from './CalendarEventCard'
import type { CalendarEvent } from '@/types'

interface CalendarEventListProps {
  events: CalendarEvent[] | undefined
  isLoading: boolean
  onEdit: (event: CalendarEvent) => void
  onDelete: (event: CalendarEvent) => void
  onDateRangeChange?: (start: Date, end: Date) => void
  currentDate?: Date
}

interface GroupedEvents {
  date: string
  dateLabel: string
  events: CalendarEvent[]
}

function groupEventsByDate(events: CalendarEvent[]): GroupedEvents[] {
  const groups: Record<string, CalendarEvent[]> = {}

  events.forEach((event) => {
    const date = new Date(event.start_time).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
  })

  return Object.entries(groups)
    .map(([date, events]) => ({
      date,
      dateLabel: formatDateLabel(new Date(date)),
      events: events.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function formatDateLabel(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  )
}

export function CalendarEventList({
  events,
  isLoading,
  onEdit,
  onDelete,
  onDateRangeChange,
  currentDate = new Date(),
}: CalendarEventListProps) {
  const groupedEvents = useMemo(() => {
    if (!events) return []
    return groupEventsByDate(events)
  }, [events])

  const handlePrevWeek = () => {
    if (onDateRangeChange) {
      const newStart = new Date(currentDate)
      newStart.setDate(newStart.getDate() - 7)
      const newEnd = new Date(newStart)
      newEnd.setDate(newEnd.getDate() + 14)
      onDateRangeChange(newStart, newEnd)
    }
  }

  const handleNextWeek = () => {
    if (onDateRangeChange) {
      const newStart = new Date(currentDate)
      newStart.setDate(newStart.getDate() + 7)
      const newEnd = new Date(newStart)
      newEnd.setDate(newEnd.getDate() + 14)
      onDateRangeChange(newStart, newEnd)
    }
  }

  const handleToday = () => {
    if (onDateRangeChange) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const end = new Date(today)
      end.setDate(end.getDate() + 14)
      onDateRangeChange(today, end)
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {onDateRangeChange && (
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </span>
        </div>
      )}

      <ScrollArea className="flex-1">
        {groupedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No events</h3>
            <p className="text-sm text-muted-foreground">
              No events scheduled for this period
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {groupedEvents.map((group) => (
              <div key={group.date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                  {group.dateLabel}
                </h3>
                <div className="space-y-2">
                  {group.events.map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
