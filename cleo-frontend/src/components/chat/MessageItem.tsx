import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Message, AgentTier } from '@/types'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'bg-background' : 'bg-background-secondary'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? 'bg-primary text-primary-foreground'
              : message.agent_tier
                ? tierGradients[message.agent_tier]
                : 'bg-muted',
            'text-white text-xs font-medium'
          )}
        >
          {isUser ? 'You' : message.agent_name?.slice(0, 2).toUpperCase() || 'AI'}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? 'You' : message.agent_name || 'Agent'}
          </span>
          {!isUser && message.agent_tier && (
            <Badge variant="secondary" className="text-xs capitalize">
              {message.agent_tier}
            </Badge>
          )}
          <span className="text-xs text-foreground-tertiary">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message content */}
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border-light">
            <p className="text-xs text-foreground-tertiary mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {message.citations.map((citation, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-background-hover"
                >
                  {citation.document_name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
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
