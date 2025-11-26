import { useState, useEffect } from 'react'
import { Plus, Power, PowerOff, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useUpdateAgent,
  useAgentSkills,
  useSkills,
  useAssignSkillToAgent,
  useUnassignSkillFromAgent,
  useToggleSkillActive
} from '@/api'
import type { Agent, AgentTier, Skill } from '@/types'

const tierOptions: { value: AgentTier; label: string; description: string }[] = [
  {
    value: 'master',
    label: 'Master',
    description: 'Orchestrates and coordinates other agents',
  },
  {
    value: 'personal',
    label: 'Personal',
    description: 'Personal assistant for individual tasks',
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Facilitates team collaboration',
  },
  {
    value: 'worker',
    label: 'Worker',
    description: 'Handles automated tasks and workflows',
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'Specialized knowledge in specific domains',
  },
]

interface EditAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent | null
}

export function EditAgentModal({ open, onOpenChange, agent }: EditAgentModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AgentTier>('personal')
  const [description, setDescription] = useState('')
  const updateAgent = useUpdateAgent()

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setType(agent.type)
      setDescription(agent.description || '')
    }
  }, [agent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !agent) return

    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update agent:', error)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update the agent's details, configuration, and skills.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4">
            <form onSubmit={handleSubmit} id="edit-agent-form">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Research Assistant"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="edit-type" className="text-sm font-medium">
                    Type <span className="text-destructive">*</span>
                  </label>
                  <Select value={type} onValueChange={(v) => setType(v as AgentTier)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tierOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <span className="font-medium">{option.label}</span>
                            <span className="text-foreground-secondary ml-2 text-xs">
                              - {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="edit-description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this agent does..."
                    rows={3}
                  />
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="skills" className="flex-1 overflow-hidden mt-4">
            <AgentSkillsTab agentId={agent.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-agent-form"
            disabled={!name.trim() || updateAgent.isPending}
          >
            {updateAgent.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AgentSkillsTab({ agentId }: { agentId: number }) {
  const { data: agentSkills, isLoading: loadingAgentSkills } = useAgentSkills(agentId)
  const { data: allSkills, isLoading: loadingAllSkills } = useSkills()
  const assignSkill = useAssignSkillToAgent()
  const unassignSkill = useUnassignSkillFromAgent()
  const toggleActive = useToggleSkillActive()
  const [selectedSkillId, setSelectedSkillId] = useState<string>('')

  // Filter out skills already assigned to the agent
  const availableSkills = allSkills?.filter(
    (skill) => !skill.is_global && skill.agent_id !== agentId
  )

  const handleAssignSkill = async () => {
    if (!selectedSkillId) return
    try {
      await assignSkill.mutateAsync({
        agentId,
        skillId: parseInt(selectedSkillId),
      })
      setSelectedSkillId('')
    } catch (error) {
      console.error('Failed to assign skill:', error)
    }
  }

  const handleUnassignSkill = async (skillId: number) => {
    try {
      await unassignSkill.mutateAsync({ agentId, skillId })
    } catch (error) {
      console.error('Failed to unassign skill:', error)
    }
  }

  const handleToggleActive = async (skill: Skill) => {
    try {
      await toggleActive.mutateAsync({
        id: skill.id,
        is_active: !skill.is_active,
      })
    } catch (error) {
      console.error('Failed to toggle skill active state:', error)
    }
  }

  if (loadingAgentSkills || loadingAllSkills) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const agentSpecificSkills = agentSkills?.filter((s) => !s.is_global) || []
  const globalSkills = agentSkills?.filter((s) => s.is_global) || []

  return (
    <div className="space-y-4">
      {/* Assign existing skill */}
      <div className="flex gap-2">
        <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Add existing skill..." />
          </SelectTrigger>
          <SelectContent>
            {availableSkills?.map((skill) => (
              <SelectItem key={skill.id} value={skill.id.toString()}>
                {skill.display_name}
              </SelectItem>
            ))}
            {(!availableSkills || availableSkills.length === 0) && (
              <div className="px-2 py-1.5 text-sm text-foreground-secondary">
                No available skills to assign
              </div>
            )}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAssignSkill}
          disabled={!selectedSkillId || assignSkill.isPending}
        >
          <Plus className="h-4 w-4 mr-1" />
          Assign
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {/* Agent-specific skills */}
          {agentSpecificSkills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground-secondary mb-2">
                Agent Skills ({agentSpecificSkills.length})
              </h4>
              <div className="space-y-2">
                {agentSpecificSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onToggleActive={() => handleToggleActive(skill)}
                    onRemove={() => handleUnassignSkill(skill.id)}
                    canRemove
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global skills */}
          {globalSkills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground-secondary mb-2">
                Global Skills ({globalSkills.length})
              </h4>
              <div className="space-y-2">
                {globalSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onToggleActive={() => handleToggleActive(skill)}
                    canRemove={false}
                  />
                ))}
              </div>
            </div>
          )}

          {agentSpecificSkills.length === 0 && globalSkills.length === 0 && (
            <div className="text-center py-8 text-foreground-secondary">
              <p>No skills assigned to this agent.</p>
              <p className="text-sm mt-1">
                Assign skills above or create new skills in the Skills page.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function SkillCard({
  skill,
  onToggleActive,
  onRemove,
  canRemove,
}: {
  skill: Skill
  onToggleActive: () => void
  onRemove?: () => void
  canRemove: boolean
}) {
  return (
    <Card className={skill.is_active ? '' : 'opacity-60'}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{skill.display_name}</CardTitle>
            {skill.is_global && (
              <Badge variant="outline" className="text-xs">
                Global
              </Badge>
            )}
            <Badge
              variant={skill.is_active ? 'default' : 'secondary'}
              className="text-xs"
            >
              {skill.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleActive}
            >
              {skill.is_active ? (
                <PowerOff className="h-3.5 w-3.5" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
            </Button>
            {canRemove && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <p className="text-xs text-foreground-secondary line-clamp-2">
          {skill.description}
        </p>
        {skill.triggers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.triggers.slice(0, 3).map((trigger) => (
              <Badge key={trigger} variant="outline" className="text-xs">
                {trigger}
              </Badge>
            ))}
            {skill.triggers.length > 3 && (
              <span className="text-xs text-foreground-tertiary">
                +{skill.triggers.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
