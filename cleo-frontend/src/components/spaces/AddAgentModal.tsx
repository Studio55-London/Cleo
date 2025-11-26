import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAgents, useAddAgentToSpace } from '@/api'
import type { Agent, AgentTier, Space } from '@/types'
import { Check } from 'lucide-react'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

const tierOrder: AgentTier[] = ['master', 'personal', 'team', 'worker', 'expert']

interface AddAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  space: Space
}

export function AddAgentModal({ open, onOpenChange, space }: AddAgentModalProps) {
  const [search, setSearch] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<number[]>([])
  const { data: agents } = useAgents()
  const addAgent = useAddAgentToSpace()

  // Get IDs of agents already in space
  const existingAgentIds = space.agents.map((a) => a.id)

  // Filter and group agents
  const filteredAgents = agents?.filter(
    (agent) =>
      !existingAgentIds.includes(agent.id) &&
      agent.name.toLowerCase().includes(search.toLowerCase())
  )

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

  const toggleAgent = (agentId: number) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    )
  }

  const handleAdd = async () => {
    try {
      // Add agents sequentially
      for (const agentId of selectedAgents) {
        await addAgent.mutateAsync({
          spaceId: space.id,
          agentId,
        })
      }

      setSelectedAgents([])
      setSearch('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add agents:', error)
    }
  }

  const handleClose = () => {
    setSelectedAgents([])
    setSearch('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Agents to Space</DialogTitle>
          <DialogDescription>
            Select agents to add to "{space.name}". They'll be able to respond to messages in this space.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ScrollArea className="h-[300px] pr-4">
            {Object.keys(groupedAgents).length === 0 ? (
              <div className="flex items-center justify-center h-full text-foreground-secondary">
                {search ? 'No agents found' : 'All agents are already in this space'}
              </div>
            ) : (
              <div className="space-y-4">
                {tierOrder.map((tier) => {
                  const tierAgents = groupedAgents[tier]
                  if (!tierAgents) return null

                  return (
                    <div key={tier}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-2 capitalize">
                        {tier} Agents
                      </h4>
                      <div className="space-y-1">
                        {tierAgents.map((agent) => (
                          <AgentRow
                            key={agent.id}
                            agent={agent}
                            selected={selectedAgents.includes(agent.id)}
                            onToggle={() => toggleAgent(agent.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedAgents.length === 0 || addAgent.isPending}
          >
            {addAgent.isPending
              ? 'Adding...'
              : `Add ${selectedAgents.length} Agent${selectedAgents.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AgentRowProps {
  agent: Agent
  selected: boolean
  onToggle: () => void
}

function AgentRow({ agent, selected, onToggle }: AgentRowProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left',
        'hover:bg-background-hover',
        selected && 'bg-primary-light'
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className={cn(tierGradients[agent.type], 'text-white text-xs')}>
          {agent.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{agent.name}</span>
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
      {selected && (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      )}
    </button>
  )
}
