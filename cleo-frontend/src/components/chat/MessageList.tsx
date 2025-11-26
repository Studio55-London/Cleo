import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageItem } from './MessageItem'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 space-y-4">
          <MessageSkeleton />
          <MessageSkeleton isAgent />
          <MessageSkeleton />
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Start a conversation
          </h3>
          <p className="text-sm text-foreground-secondary">
            Type a message below to start chatting with agents in this space.
            Use @mention to direct your message to a specific agent.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="divide-y divide-border-light">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
      <div ref={bottomRef} />
    </ScrollArea>
  )
}

function MessageSkeleton({ isAgent = false }: { isAgent?: boolean }) {
  return (
    <div className={`flex gap-3 px-4 py-3 ${isAgent ? 'bg-background-secondary' : ''}`}>
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
