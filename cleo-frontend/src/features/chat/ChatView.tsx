import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Globe, FolderOpen } from 'lucide-react'
import { MessageList, ChatInput } from '@/components/chat'
import { useMessages, useSendMessage, useSpace, useAgents, useSpaces } from '@/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
        spaceName={space?.is_global ? 'Global Space' : space?.name}
        isLoading={spaceLoading}
        isGlobal={space?.is_global}
        knowledgeBaseCount={space?.knowledge_bases?.length}
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
  isGlobal?: boolean
  knowledgeBaseCount?: number
}

function ChatHeader({ spaceName, isLoading, isGlobal, knowledgeBaseCount }: ChatHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center h-header px-4 border-b border-border">
        <Skeleton className="h-6 w-48" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between h-header px-4 border-b border-border">
        <div className="flex items-center gap-2">
          {isGlobal && <Globe className="h-5 w-5 text-primary" />}
          <h1 className="text-lg font-semibold text-foreground truncate">
            {spaceName || 'Chat'}
          </h1>
          {isGlobal && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
              All Knowledge
            </Badge>
          )}
        </div>
        {knowledgeBaseCount !== undefined && knowledgeBaseCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-foreground-tertiary">
                <FolderOpen className="h-3.5 w-3.5" />
                <span>{knowledgeBaseCount} KB{knowledgeBaseCount !== 1 ? 's' : ''}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isGlobal
                  ? 'Using knowledge from all spaces'
                  : `Using ${knowledgeBaseCount} knowledge base${knowledgeBaseCount !== 1 ? 's' : ''} for context`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
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
