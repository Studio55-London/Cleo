import { Bell, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationItem } from './NotificationItem'
import type { Notification } from '@/types'

interface NotificationListProps {
  notifications: Notification[] | undefined
  isLoading: boolean
  onMarkRead: (notification: Notification) => void
  onDismiss: (notification: Notification) => void
  onMarkAllRead?: () => void
  onDismissAll?: () => void
  onClick?: (notification: Notification) => void
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

export function NotificationList({
  notifications,
  isLoading,
  onMarkRead,
  onDismiss,
  onMarkAllRead,
  onDismissAll,
  onClick,
}: NotificationListProps) {
  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {notifications && notifications.length > 0 && (
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
          <div className="flex items-center gap-2">
            {onMarkAllRead && unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="h-8">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
            {onDismissAll && notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onDismissAll} className="h-8">
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
                onClick={onClick}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
