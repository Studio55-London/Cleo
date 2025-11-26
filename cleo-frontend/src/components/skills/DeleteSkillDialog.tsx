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
import { useDeleteSkill } from '@/api'
import type { Skill } from '@/types'

interface DeleteSkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: Skill | null
}

export function DeleteSkillDialog({
  open,
  onOpenChange,
  skill,
}: DeleteSkillDialogProps) {
  const deleteSkill = useDeleteSkill()

  const handleDelete = async () => {
    if (!skill) return

    try {
      await deleteSkill.mutateAsync(skill.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete skill:', error)
    }
  }

  if (!skill) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Skill</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{skill.display_name}</strong>? This
            action cannot be undone.
            {skill.is_global && (
              <span className="block mt-2 text-amber-600">
                This is a global skill that may be used by multiple agents.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteSkill.isPending}
          >
            {deleteSkill.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
