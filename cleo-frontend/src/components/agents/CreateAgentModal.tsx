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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateAgent } from '@/api'
import type { AgentTier } from '@/types'

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

interface CreateAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAgentModal({ open, onOpenChange }: CreateAgentModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AgentTier>('personal')
  const [description, setDescription] = useState('')
  const createAgent = useCreateAgent()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    try {
      await createAgent.mutateAsync({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      })

      // Reset form
      setName('')
      setType('personal')
      setDescription('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  const handleClose = () => {
    setName('')
    setType('personal')
    setDescription('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Create an AI agent to help you with specific tasks and workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Research Assistant"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
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
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this agent does..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createAgent.isPending}
            >
              {createAgent.isPending ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
