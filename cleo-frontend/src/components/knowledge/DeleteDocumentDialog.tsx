import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteDocument } from '@/api'
import type { Document } from '@/types'
import { AlertTriangle } from 'lucide-react'

interface DeleteDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document | null
}

export function DeleteDocumentDialog({
  open,
  onOpenChange,
  document,
}: DeleteDocumentDialogProps) {
  const deleteDocument = useDeleteDocument()

  const handleDelete = async () => {
    if (!document) return

    try {
      await deleteDocument.mutateAsync(document.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Document
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{document.name}"? This will remove
            all extracted entities and relations from the knowledge graph. This
            action cannot be undone.
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
            disabled={deleteDocument.isPending}
          >
            {deleteDocument.isPending ? 'Deleting...' : 'Delete Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
