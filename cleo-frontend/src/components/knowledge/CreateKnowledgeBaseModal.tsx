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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateKnowledgeBase } from '@/api'

interface CreateKnowledgeBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: number | string
  onSuccess?: () => void
}

export function CreateKnowledgeBaseModal({
  open,
  onOpenChange,
  spaceId,
  onSuccess,
}: CreateKnowledgeBaseModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createKnowledgeBase = useCreateKnowledgeBase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await createKnowledgeBase.mutateAsync({
        spaceId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      })
      handleClose()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create knowledge base:', error)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              Create a new knowledge base to organize related documents together.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Project Documentation"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of documents will this contain?"
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
              disabled={!name.trim() || createKnowledgeBase.isPending}
            >
              {createKnowledgeBase.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
