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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSetMasterAgent } from '@/api'
import type { AgentTier, Space, AgentSummary } from '@/types'
import { Check, Crown } from 'lucide-react'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

interface SelectMasterAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  space: Space
}

export function SelectMasterAgentModal({
  open,
  onOpenChange,
  space,
}: SelectMasterAgentModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(
    space.master_agent_id
  )
  const setMasterAgent = useSetMasterAgent()

  const handleSave = async () => {
    try {
      await setMasterAgent.mutateAsync({
        spaceId: space.id,
        agentId: selectedAgentId,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to set master agent:', error)
    }
  }

  const handleClose = () => {
    setSelectedAgentId(space.master_agent_id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Select Master Agent
          </DialogTitle>
          <DialogDescription>
            The master agent will be the primary responder in this space. Messages without @mentions will be directed to them.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-1">
            {/* Option to have no master agent */}
            <button
              onClick={() => setSelectedAgentId(null)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left',
                'hover:bg-background-hover border border-transparent',
                selectedAgentId === null && 'border-primary bg-primary-light'
              )}
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs text-foreground-secondary">None</span>
              </div>
              <div className="flex-1">
                <span className="font-medium text-sm">No Master Agent</span>
                <p className="text-xs text-foreground-secondary">
                  Messages will require @mentions to reach specific agents
                </p>
              </div>
              {selectedAgentId === null && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </button>

            {/* List space agents */}
            {space.agents.length === 0 ? (
              <div className="py-8 text-center text-foreground-secondary text-sm">
                Add agents to this space first to select a master agent.
              </div>
            ) : (
              space.agents.map((agent) => (
                <AgentOption
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgentId === agent.id}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={setMasterAgent.isPending}
          >
            {setMasterAgent.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AgentOptionProps {
  agent: AgentSummary
  selected: boolean
  onSelect: () => void
}

function AgentOption({ agent, selected, onSelect }: AgentOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left',
        'hover:bg-background-hover border border-transparent',
        selected && 'border-primary bg-primary-light'
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className={cn(tierGradients[agent.tier], 'text-white text-sm')}>
          {agent.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{agent.name}</span>
          <Badge variant="secondary" className="text-xs capitalize">
            {agent.tier}
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
