import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AgentCard } from './AgentCard'
import type { Agent, AgentTier } from '@/types'

const tierOrder: AgentTier[] = ['master', 'personal', 'team', 'worker', 'expert']

interface AgentGridProps {
  agents: Agent[] | undefined
  isLoading: boolean
  filterTier?: AgentTier | 'all'
  searchQuery?: string
  onEdit: (agent: Agent) => void
  onDelete: (agent: Agent) => void
  onToggleStatus: (agent: Agent) => void
}

export function AgentGrid({
  agents,
  isLoading,
  filterTier = 'all',
  searchQuery = '',
  onEdit,
  onDelete,
  onToggleStatus,
}: AgentGridProps) {
  if (isLoading) {
    return <AgentGridSkeleton />
  }

  const filteredAgents = agents?.filter((agent) => {
    const matchesTier = filterTier === 'all' || agent.type === filterTier
    const matchesSearch =
      searchQuery === '' ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTier && matchesSearch
  })

  const groupedAgents = tierOrder.reduce(
    (acc, tier) => {
      const tierAgents = filteredAgents?.filter((a) => a.type === tier) || []
      if (tierAgents.length > 0) {
        acc[tier] = tierAgents
      }
      return acc
    },
    {} as Record<AgentTier, Agent[]>
  )

  if (!filteredAgents?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-foreground-secondary">No agents found</p>
        {searchQuery && (
          <p className="text-sm text-foreground-tertiary mt-1">
            Try adjusting your search or filters
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {tierOrder.map((tier) => {
        const tierAgents = groupedAgents[tier]
        if (!tierAgents?.length) return null

        return (
          <div key={tier}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-tertiary mb-4 capitalize">
              {tier} Agents ({tierAgents.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tierAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AgentGridSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((section) => (
        <div key={section}>
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((card) => (
              <Card key={card}>
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="mt-4 pt-3 border-t border-border-light">
                    <Skeleton className="h-3 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
