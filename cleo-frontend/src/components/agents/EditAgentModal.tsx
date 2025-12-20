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
import { useUpdateAgent } from '@/api'
import type { Agent, AgentTier } from '@/types'

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update the agent's details and configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="edit-agent-form">
          <div className="grid gap-4 py-4">
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

        <DialogFooter>
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
