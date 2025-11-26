import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Info, Settings, UserPlus, Crown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useSpace } from '@/api'
import {
  AddAgentModal,
  SelectMasterAgentModal,
  DeleteSpaceDialog,
} from '@/components/spaces'
import type { AgentTier } from '@/types'

const tierGradients: Record<AgentTier, string> = {
  master: 'bg-tier-master',
  personal: 'bg-tier-personal',
  team: 'bg-tier-team',
  worker: 'bg-tier-worker',
  expert: 'bg-tier-expert',
}

export function RightSidebar() {
  const { spaceId } = useParams()
  const { data: space, isLoading: spaceLoading } = useSpace(spaceId)
  const [activeTab, setActiveTab] = useState('agents')
  const [addAgentOpen, setAddAgentOpen] = useState(false)
  const [selectMasterOpen, setSelectMasterOpen] = useState(false)
  const [deleteSpaceOpen, setDeleteSpaceOpen] = useState(false)

  if (!spaceId) {
    return (
      <aside className="w-right-sidebar border-l border-border bg-background p-6">
        <div className="flex h-full items-center justify-center text-foreground-secondary">
          Select a space to see details
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-right-sidebar flex flex-col border-l border-border bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 p-1 m-2">
          <TabsTrigger value="agents" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Agents</span>
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-1">
            <Info className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Info</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full p-4">
            {spaceLoading ? (
              <AgentListSkeleton />
            ) : (
              <div className="space-y-3">
                {space?.master_agent && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-2">
                      Master Agent
                    </h4>
                    <AgentCard
                      name={space.master_agent.name}
                      tier={space.master_agent.tier}
                      description={space.master_agent.description}
                      isMaster
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                    Space Agents ({space?.agents.length || 0})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAddAgentOpen(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                {space?.agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    name={agent.name}
                    tier={agent.tier}
                  />
                ))}
                {space?.agents.length === 0 && (
                  <p className="text-sm text-foreground-secondary">
                    No agents in this space yet.
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="info" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full p-4">
            {spaceLoading ? (
              <InfoSkeleton />
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-1">
                    Name
                  </h4>
                  <p className="text-sm">{space?.name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-1">
                    Description
                  </h4>
                  <p className="text-sm text-foreground-secondary">
                    {space?.description || 'No description'}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-1">
                    Created
                  </h4>
                  <p className="text-sm">
                    {space?.created_at
                      ? new Date(space.created_at).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full p-4">
            {space && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-3">
                    Agent Management
                  </h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setSelectMasterOpen(true)}
                    >
                      <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                      Select Master Agent
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setAddAgentOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Agents to Space
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-3">
                    Danger Zone
                  </h4>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteSpaceOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Space
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {space && (
        <>
          <AddAgentModal
            open={addAgentOpen}
            onOpenChange={setAddAgentOpen}
            space={space}
          />
          <SelectMasterAgentModal
            open={selectMasterOpen}
            onOpenChange={setSelectMasterOpen}
            space={space}
          />
          <DeleteSpaceDialog
            open={deleteSpaceOpen}
            onOpenChange={setDeleteSpaceOpen}
            space={space}
          />
        </>
      )}
    </aside>
  )
}

interface AgentCardProps {
  name: string
  tier: AgentTier
  description?: string
  isMaster?: boolean
}

function AgentCard({ name, tier, description, isMaster }: AgentCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border border-border',
        isMaster && 'border-primary/50 bg-primary-light/30'
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className={cn(tierGradients[tier], 'text-white')}>
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{name}</span>
          <Badge variant="secondary" className="text-xs capitalize">
            {tier}
          </Badge>
        </div>
        {description && (
          <p className="text-xs text-foreground-secondary truncate mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function AgentListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}
