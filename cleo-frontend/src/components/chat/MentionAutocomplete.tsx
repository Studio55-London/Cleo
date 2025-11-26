import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Agent, AgentTier } from '@/types'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

interface MentionAutocompleteProps {
  agents: Agent[]
  onSelect: (agent: Agent) => void
  onClose: () => void
}

export function MentionAutocomplete({
  agents,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (agents.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 z-50"
    >
      <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
        <div className="p-2">
          <p className="text-xs text-foreground-tertiary px-2 py-1 mb-1">
            Mention an agent
          </p>
          {agents.slice(0, 8).map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent)}
              className={cn(
                'w-full flex items-center gap-3 px-2 py-2 rounded-md',
                'hover:bg-background-hover transition-colors',
                'text-left'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className={cn(tierGradients[agent.type], 'text-white text-xs')}
                >
                  {agent.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {agent.name}
                  </span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {agent.type}
                  </Badge>
                </div>
                {agent.description && (
                  <p className="text-xs text-foreground-secondary truncate">
                    {agent.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
