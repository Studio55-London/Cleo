import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteAgent } from '@/api'
import type { Agent } from '@/types'
import { AlertTriangle } from 'lucide-react'

interface DeleteAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent | null
}

export function DeleteAgentDialog({
  open,
  onOpenChange,
  agent,
}: DeleteAgentDialogProps) {
  const deleteAgent = useDeleteAgent()

  const handleDelete = async () => {
    if (!agent) return

    try {
      await deleteAgent.mutateAsync(agent.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete agent:', error)
    }
  }

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Agent
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{agent.name}"? This will remove the
            agent from all spaces and delete all associated data. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
          >
            {deleteAgent.isPending ? 'Deleting...' : 'Delete Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
