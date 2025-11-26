import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { MessageList, ChatInput } from '@/components/chat'
import { useMessages, useSendMessage, useSpace, useAgents, useSpaces } from '@/api'
import { Skeleton } from '@/components/ui/skeleton'

export function ChatView() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const { data: spaces, isLoading: spacesLoading } = useSpaces()
  const { data: space, isLoading: spaceLoading } = useSpace(spaceId)
  const { data: messages, isLoading: messagesLoading } = useMessages(spaceId)
  const { data: agents } = useAgents()
  const sendMessage = useSendMessage()

  // Redirect to first space if no spaceId
  useEffect(() => {
    if (!spaceId && spaces && spaces.length > 0) {
      navigate(`/chat/${spaces[0].id}`, { replace: true })
    }
  }, [spaceId, spaces, navigate])

  const handleSendMessage = (content: string, mentions: string[]) => {
    if (!spaceId) return

    sendMessage.mutate({
      spaceId,
      data: { message: content, mentions },
    })
  }

  // Show loading state
  if (!spaceId) {
    if (spacesLoading) {
      return <ChatViewSkeleton />
    }

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h3 className="text-lg font-medium text-foreground mb-2">
            No spaces yet
          </h3>
          <p className="text-sm text-foreground-secondary">
            Create a space to start chatting with your agents.
          </p>
        </div>
      </div>
    )
  }

  const availableAgents = agents || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        spaceName={space?.name}
        isLoading={spaceLoading}
      />

      {/* Messages */}
      <MessageList
        messages={messages || []}
        isLoading={messagesLoading}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        agents={availableAgents}
        disabled={sendMessage.isPending}
        placeholder={
          space?.master_agent
            ? `Message ${space.master_agent.name}...`
            : 'Type a message... Use @ to mention an agent'
        }
      />
    </div>
  )
}

interface ChatHeaderProps {
  spaceName?: string
  isLoading?: boolean
}

function ChatHeader({ spaceName, isLoading }: ChatHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center h-header px-4 border-b border-border">
        <Skeleton className="h-6 w-48" />
      </div>
    )
  }

  return (
    <div className="flex items-center h-header px-4 border-b border-border">
      <h1 className="text-lg font-semibold text-foreground truncate">
        {spaceName || 'Chat'}
      </h1>
    </div>
  )
}

function ChatViewSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-header px-4 border-b border-border">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    </div>
  )
}
