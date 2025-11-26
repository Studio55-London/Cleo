import { Link } from 'react-router-dom'
import { Clock, MessageSquare } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSpaces } from '@/api'
import { Skeleton } from '@/components/ui/skeleton'

interface HistoryItem {
  id: string
  name: string
  lastMessage?: string
  timestamp: string
}

export function HistoryPanel() {
  const { data: spaces, isLoading } = useSpaces()

  // Convert spaces to history items (sorted by last activity)
  const historyItems: HistoryItem[] = spaces?.map((space) => ({
    id: space.id,
    name: space.name,
    lastMessage: space.description,
    timestamp: space.created_at || new Date().toISOString(),
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || []

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <HistorySkeleton />
        ) : historyItems.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">No history yet</p>
            <p className="text-xs text-foreground-tertiary mt-1">
              Your recent conversations will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {historyItems.map((item) => (
              <Link
                key={item.id}
                to={`/chat/${item.id}`}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-background-hover transition-colors"
              >
                <MessageSquare className="h-4 w-4 mt-0.5 text-foreground-tertiary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <span className="text-xs text-foreground-tertiary whitespace-nowrap">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  {item.lastMessage && (
                    <p className="text-xs text-foreground-tertiary truncate mt-0.5">
                      {item.lastMessage}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full mt-1" />
          </div>
        </div>
      ))}
    </div>
  )
}
