import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { NotificationList } from './NotificationList'
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDismissNotification,
  useDismissAllNotifications,
} from '@/api/hooks'
import type { Notification } from '@/types'

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  const { data: notifications, isLoading } = useNotifications({ limit: 20 })
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const dismissNotification = useDismissNotification()
  const dismissAll = useDismissAllNotifications()

  const handleMarkRead = (notification: Notification) => {
    markAsRead.mutate(notification.id)
  }

  const handleDismiss = (notification: Notification) => {
    dismissNotification.mutate(notification.id)
  }

  const handleMarkAllRead = () => {
    markAllAsRead.mutate()
  }

  const handleDismissAll = () => {
    dismissAll.mutate()
    setOpen(false)
  }

  const handleClick = (notification: Notification) => {
    onNotificationClick?.(notification)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                'min-w-[18px] h-[18px] px-1 text-[10px] font-medium',
                'bg-red-500 text-white rounded-full'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="h-96">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkRead={handleMarkRead}
            onDismiss={handleDismiss}
            onMarkAllRead={handleMarkAllRead}
            onDismissAll={handleDismissAll}
            onClick={handleClick}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
