import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  X,
  MessageSquare,
  Settings,
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
import type { Notification, NotificationType, NotificationPriority } from '@/types'

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (notification: Notification) => void
  onDismiss: (notification: Notification) => void
  onClick?: (notification: Notification) => void
}

const typeIcons: Record<NotificationType, typeof Bell> = {
  task_due: Clock,
  task_overdue: AlertTriangle,
  reminder: Bell,
  system: Settings,
  mention: MessageSquare,
  calendar: Calendar,
}

const priorityColors: Record<NotificationPriority, string> = {
  low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  normal: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const typeColors: Record<NotificationType, string> = {
  task_due: 'text-yellow-500',
  task_overdue: 'text-red-500',
  reminder: 'text-blue-500',
  system: 'text-gray-500',
  mention: 'text-purple-500',
  calendar: 'text-green-500',
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onClick,
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const Icon = typeIcons[notification.type]
  const isUnread = !notification.is_read
  const isUrgent = notification.priority === 'urgent' || notification.priority === 'high'

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification)
    }
    onClick?.(notification)
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer hover:shadow-md',
        isUnread && 'bg-blue-500/5 border-blue-500/20',
        isUrgent && isUnread && 'border-l-2 border-l-red-500'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-muted',
              typeColors[notification.type]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3
                  className={cn(
                    'text-sm leading-tight',
                    isUnread ? 'font-medium' : 'font-normal text-muted-foreground'
                  )}
                >
                  {notification.title}
                </h3>
                {notification.message && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isUnread && (
                      <DropdownMenuItem onClick={() => onMarkRead(notification)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDismiss(notification)}>
                      <X className="h-4 w-4 mr-2" />
                      Dismiss
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn('text-xs py-0', priorityColors[notification.priority])}
              >
                {notification.priority}
              </Badge>

              {notification.space_name && (
                <Badge variant="secondary" className="text-xs py-0">
                  {notification.space_name}
                </Badge>
              )}

              <span className="text-xs text-muted-foreground ml-auto">
                {formatTimeAgo(notification.created_at)}
              </span>

              {isUnread && (
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
