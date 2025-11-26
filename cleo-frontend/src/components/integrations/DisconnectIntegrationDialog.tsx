import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDisconnectIntegration } from '@/api'
import type { Integration } from '@/types'
import { AlertTriangle } from 'lucide-react'

interface DisconnectIntegrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: Integration | null
}

export function DisconnectIntegrationDialog({
  open,
  onOpenChange,
  integration,
}: DisconnectIntegrationDialogProps) {
  const disconnectIntegration = useDisconnectIntegration()

  const handleDisconnect = async () => {
    if (!integration) return

    try {
      await disconnectIntegration.mutateAsync(integration.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
    }
  }

  if (!integration) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Disconnect Integration
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect "
            {integration.display_name || integration.name}"? Your agents will no
            longer be able to use this integration.
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
            onClick={handleDisconnect}
            disabled={disconnectIntegration.isPending}
          >
            {disconnectIntegration.isPending ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
