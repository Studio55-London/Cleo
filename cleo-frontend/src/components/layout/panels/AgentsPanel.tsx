import { Link } from 'react-router-dom'
import { Users, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAgents } from '@/api'
import type { Agent, AgentTier } from '@/types'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

const tierColors: Record<AgentTier, string> = {
  master: 'text-purple-600 bg-purple-100',
  personal: 'text-pink-600 bg-pink-100',
  team: 'text-blue-600 bg-blue-100',
  worker: 'text-green-600 bg-green-100',
  expert: 'text-orange-600 bg-orange-100',
}

export function AgentsPanel() {
  const { data: agents, isLoading } = useAgents()

  // Group agents by type (tier)
  const agentsByTier = agents?.reduce<Partial<Record<AgentTier, Agent[]>>>((acc, agent) => {
    const tier = agent.type || 'worker'
    if (!acc[tier]) acc[tier] = []
    acc[tier]!.push(agent)
    return acc
  }, {}) || {}

  const tierOrder: AgentTier[] = ['master', 'expert', 'personal', 'team', 'worker']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
          Your Agents ({agents?.length || 0})
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <AgentsSkeleton />
        ) : !agents || agents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">No agents yet</p>
            <p className="text-xs text-foreground-tertiary mt-1">
              Create agents to assist in your conversations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tierOrder.map((tier) => {
              const tierAgents = agentsByTier[tier]
              if (!tierAgents || tierAgents.length === 0) return null

              return (
                <div key={tier}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-2 capitalize">
                    {tier} Agents ({tierAgents.length})
                  </h4>
                  <div className="space-y-2">
                    {tierAgents.map((agent) => (
                      <AgentCard key={agent.id} agent={agent} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* View All / Manage Button */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="outline" asChild>
          <Link to="/agents">
            <Bot className="h-4 w-4 mr-2" />
            Manage Agents
          </Link>
        </Button>
      </div>
    </div>
  )
}

interface AgentCardProps {
  agent: Agent
}

function AgentCard({ agent }: AgentCardProps) {
  const tier = agent.type || 'worker'

  return (
    <Link
      to="/agents"
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-background-hover transition-colors"
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback className={cn(tierGradients[tier], 'text-white text-xs')}>
          {agent.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{agent.name}</p>
          <Badge variant="secondary" className={cn('text-xs capitalize', tierColors[tier])}>
            {tier}
          </Badge>
        </div>
        {agent.description && (
          <p className="text-xs text-foreground-tertiary truncate mt-0.5">
            {agent.description}
          </p>
        )}
      </div>
    </Link>
  )
}

function AgentsSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-3 w-24 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
