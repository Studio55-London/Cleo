import { useState, useEffect } from 'react'
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
import { X } from 'lucide-react'
import { useCreateSkill, useSkillTemplate, useSkillCategories, useAgents } from '@/api'
import type { SkillCategory } from '@/types'

interface CreateSkillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAgentId?: number
}

export function CreateSkillModal({
  open,
  onOpenChange,
  defaultAgentId,
}: CreateSkillModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<SkillCategory>('productivity')
  const [isGlobal, setIsGlobal] = useState(!defaultAgentId)
  const [agentId, setAgentId] = useState<number | undefined>(defaultAgentId)
  const [triggers, setTriggers] = useState<string[]>([])
  const [triggerInput, setTriggerInput] = useState('')

  const { data: categories } = useSkillCategories()
  const { data: agents } = useAgents()
  const { data: template } = useSkillTemplate(category)
  const createSkill = useCreateSkill()

  // Load template when category changes
  useEffect(() => {
    if (template && !content) {
      setContent(template)
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim() || !description.trim() || !content.trim()) return

    try {
      await createSkill.mutateAsync({
        display_name: displayName.trim(),
        description: description.trim(),
        content: content.trim(),
        category,
        is_global: isGlobal,
        agent_id: isGlobal ? undefined : agentId,
        triggers,
      })

      handleClose()
    } catch (error) {
      console.error('Failed to create skill:', error)
    }
  }

  const handleClose = () => {
    setDisplayName('')
    setDescription('')
    setContent('')
    setCategory('productivity')
    setIsGlobal(!defaultAgentId)
    setAgentId(defaultAgentId)
    setTriggers([])
    setTriggerInput('')
    onOpenChange(false)
  }

  const handleAddTrigger = () => {
    if (triggerInput.trim() && !triggers.includes(triggerInput.trim().toLowerCase())) {
      setTriggers([...triggers, triggerInput.trim().toLowerCase()])
      setTriggerInput('')
    }
  }

  const handleRemoveTrigger = (trigger: string) => {
    setTriggers(triggers.filter((t) => t !== trigger))
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTrigger()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>Create New Skill</DialogTitle>
            <DialogDescription>
              Create a skill to guide agent behavior for specific tasks.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">SKILL.md Content</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Task Prioritization"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when this skill should be used..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Category
                  </label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as SkillCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories || []).map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scope</label>
                  <Select
                    value={isGlobal ? 'global' : 'agent'}
                    onValueChange={(v) => setIsGlobal(v === 'global')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (All Agents)</SelectItem>
                      <SelectItem value="agent">Specific Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isGlobal && (
                <div className="space-y-2">
                  <label htmlFor="agent" className="text-sm font-medium">
                    Assign to Agent
                  </label>
                  <Select
                    value={agentId?.toString() || ''}
                    onValueChange={(v) => setAgentId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Trigger Keywords</label>
                <div className="flex gap-2">
                  <Input
                    value={triggerInput}
                    onChange={(e) => setTriggerInput(e.target.value)}
                    onKeyDown={handleTriggerKeyDown}
                    placeholder="Add keyword and press Enter"
                  />
                  <Button type="button" variant="outline" onClick={handleAddTrigger}>
                    Add
                  </Button>
                </div>
                {triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {triggers.map((trigger) => (
                      <Badge key={trigger} variant="secondary" className="gap-1">
                        {trigger}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTrigger(trigger)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="content" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-2 h-full flex flex-col">
                <div className="flex justify-between items-center">
                  <label htmlFor="content" className="text-sm font-medium">
                    SKILL.md Content <span className="text-destructive">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => template && setContent(template)}
                  >
                    Load Template
                  </Button>
                </div>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="---&#10;name: my-skill&#10;description: What this skill does&#10;---&#10;&#10;# Skill Instructions..."
                  className="flex-1 font-mono text-sm min-h-[300px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !displayName.trim() ||
                !description.trim() ||
                !content.trim() ||
                createSkill.isPending
              }
            >
              {createSkill.isPending ? 'Creating...' : 'Create Skill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
