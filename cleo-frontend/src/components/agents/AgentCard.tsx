import { MoreHorizontal, Edit, Trash2, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Agent, AgentTier } from '@/types'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

const tierDescriptions: Record<AgentTier, string> = {
  master: 'Orchestrates other agents',
  personal: 'Personal assistant',
  team: 'Team collaboration',
  worker: 'Task automation',
  expert: 'Specialized knowledge',
}

interface AgentCardProps {
  agent: Agent
  onEdit: (agent: Agent) => void
  onDelete: (agent: Agent) => void
  onToggleStatus: (agent: Agent) => void
}

export function AgentCard({
  agent,
  onEdit,
  onDelete,
  onToggleStatus,
}: AgentCardProps) {
  const isActive = agent.status === 'active'

  return (
    <Card className={cn('transition-all hover:shadow-md', !isActive && 'opacity-60')}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback
              className={cn(tierGradients[agent.type], 'text-white text-lg')}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-base">{agent.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">
                {agent.type}
              </Badge>
              <Badge
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'text-xs',
                  isActive
                    ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                    : 'text-foreground-secondary'
                )}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(agent)}>
              {isActive ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(agent)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary line-clamp-2">
          {agent.description || tierDescriptions[agent.type]}
        </p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-light">
          <span className="text-xs text-foreground-tertiary">
            Created {new Date(agent.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
