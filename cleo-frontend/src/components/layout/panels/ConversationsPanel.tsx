import { Link, useParams } from 'react-router-dom'
import { MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useSpaces } from '@/api'

export function ConversationsPanel() {
  const { spaceId } = useParams()
  const { data: spaces, isLoading } = useSpaces()

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {isLoading ? (
            <ConversationsSkeleton />
          ) : spaces?.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
              <p className="text-sm text-foreground-secondary">No conversations yet</p>
              <p className="text-xs text-foreground-tertiary mt-1">
                Create a space to start chatting
              </p>
            </div>
          ) : (
            spaces?.map((space) => (
              <Link
                key={space.id}
                to={`/chat/${space.id}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'hover:bg-background-hover',
                  spaceId === space.id && 'bg-primary-light text-primary'
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{space.name}</p>
                  {space.description && (
                    <p className="text-xs text-foreground-tertiary truncate">
                      {space.description}
                    </p>
                  )}
                </div>
                {space.unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {space.unread}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </ScrollArea>

      {/* New Chat Button */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" asChild>
          <Link to="/chat/new">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ConversationsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
