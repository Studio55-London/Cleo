import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteKnowledgeBase } from '@/api'
import type { KnowledgeBase } from '@/types'

interface DeleteKnowledgeBaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBase: KnowledgeBase | null
}

export function DeleteKnowledgeBaseDialog({
  open,
  onOpenChange,
  knowledgeBase,
}: DeleteKnowledgeBaseDialogProps) {
  const deleteKnowledgeBase = useDeleteKnowledgeBase()

  const handleDelete = async () => {
    if (!knowledgeBase) return

    try {
      await deleteKnowledgeBase.mutateAsync(knowledgeBase.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete knowledge base:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{knowledgeBase?.name}"? This will
            remove all document associations but will not delete the documents
            themselves. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteKnowledgeBase.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
