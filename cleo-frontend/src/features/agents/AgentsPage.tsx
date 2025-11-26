import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AgentGrid,
  CreateAgentModal,
  EditAgentModal,
  DeleteAgentDialog,
} from '@/components/agents'
import { useAgents, useUpdateAgent } from '@/api'
import type { Agent, AgentTier } from '@/types'

type FilterTier = AgentTier | 'all'

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents()
  const updateAgent = useUpdateAgent()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState<FilterTier>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null)

  const handleToggleStatus = async (agent: Agent) => {
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        status: agent.status === 'active' ? 'inactive' : 'active',
      })
    } catch (error) {
      console.error('Failed to toggle agent status:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Manage your AI agents and their configurations
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterTier}
            onValueChange={(v) => setFilterTier(v as FilterTier)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="master">Master</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="worker">Worker</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agent Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <AgentGrid
            agents={agents}
            isLoading={isLoading}
            filterTier={filterTier}
            searchQuery={searchQuery}
            onEdit={setEditingAgent}
            onDelete={setDeletingAgent}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </ScrollArea>

      {/* Modals */}
      <CreateAgentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
      <EditAgentModal
        open={!!editingAgent}
        onOpenChange={(open) => !open && setEditingAgent(null)}
        agent={editingAgent}
      />
      <DeleteAgentDialog
        open={!!deletingAgent}
        onOpenChange={(open) => !open && setDeletingAgent(null)}
        agent={deletingAgent}
      />
    </div>
  )
}
