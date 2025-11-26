import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteSpace } from '@/api'
import type { Space } from '@/types'
import { AlertTriangle } from 'lucide-react'

interface DeleteSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  space: Space
}

export function DeleteSpaceDialog({
  open,
  onOpenChange,
  space,
}: DeleteSpaceDialogProps) {
  const navigate = useNavigate()
  const deleteSpace = useDeleteSpace()

  const handleDelete = async () => {
    try {
      await deleteSpace.mutateAsync(space.id)
      onOpenChange(false)
      navigate('/chat')
    } catch (error) {
      console.error('Failed to delete space:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Space
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{space.name}"? This will permanently delete all messages in this space. This action cannot be undone.
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
            disabled={deleteSpace.isPending}
          >
            {deleteSpace.isPending ? 'Deleting...' : 'Delete Space'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
