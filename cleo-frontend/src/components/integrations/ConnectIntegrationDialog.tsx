import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useConnectIntegration, useTestIntegration } from '@/api'
import type { Integration } from '@/types'

interface ConnectIntegrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: Integration | null
}

// Define config fields for different integrations
// Field names must match what Flask backend expects (see app.py validate_integration_config)
const configFields: Record<string, { key: string; label: string; type: string; placeholder: string }[]> = {
  todoist: [
    { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'Your Todoist API token...' },
  ],
  slack: [
    { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
    { key: 'channel', label: 'Default Channel', type: 'text', placeholder: '#general' },
  ],
  telegram: [
    { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Your Telegram bot token...' },
    { key: 'chat_id', label: 'Chat ID (optional)', type: 'text', placeholder: 'Chat or channel ID' },
  ],
  gmail: [
    { key: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
  ],
  google_calendar: [
    { key: 'credentials', label: 'Credentials JSON', type: 'password', placeholder: 'Google OAuth credentials' },
  ],
  microsoft_graph: [
    { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: 'Azure AD tenant ID' },
    { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Application client ID' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Application secret' },
  ],
  notion: [
    { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'secret_...' },
    { key: 'database_id', label: 'Database ID', type: 'text', placeholder: 'Database ID' },
  ],
  github: [
    { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' },
    { key: 'repo', label: 'Repository', type: 'text', placeholder: 'owner/repo' },
  ],
  default: [
    { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter API key...' },
  ],
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export function ConnectIntegrationDialog({
  open,
  onOpenChange,
  integration,
}: ConnectIntegrationDialogProps) {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState<string>('')
  const connectIntegration = useConnectIntegration()
  const testIntegration = useTestIntegration()

  // Reset form when integration changes
  useEffect(() => {
    if (integration) {
      setConfig(integration.config || {})
      setTestStatus('idle')
      setTestMessage('')
    }
  }, [integration])

  const handleTest = async () => {
    if (!integration) return

    setTestStatus('testing')
    setTestMessage('')

    try {
      // First save the config temporarily
      await connectIntegration.mutateAsync({
        id: integration.id,
        config,
      })

      // Then test the connection
      const result = await testIntegration.mutateAsync(integration.id)

      if (result.success) {
        setTestStatus('success')
        setTestMessage(result.message || 'Connection successful!')
      } else {
        setTestStatus('error')
        // Parse API error codes to give better feedback
        let errorMessage = result.message || 'Connection test failed'
        if (errorMessage.includes('401')) {
          errorMessage = 'Invalid credentials. Please check your API token and try again.'
        } else if (errorMessage.includes('403')) {
          errorMessage = 'Access denied. Please check your permissions.'
        } else if (errorMessage.includes('404')) {
          errorMessage = 'Service not found. Please verify the configuration.'
        }
        setTestMessage(errorMessage)
      }
    } catch (error) {
      setTestStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed'
      // Check if it's a network or API error
      if (errorMessage.includes('401')) {
        setTestMessage('Invalid credentials. Please check your API token and try again.')
      } else {
        setTestMessage(errorMessage)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!integration) return

    try {
      await connectIntegration.mutateAsync({
        id: integration.id,
        config,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to connect integration:', error)
    }
  }

  const handleClose = () => {
    setConfig({})
    setTestStatus('idle')
    setTestMessage('')
    onOpenChange(false)
  }

  if (!integration) return null

  const fields = configFields[integration.name.toLowerCase()] || configFields.default
  const isAnyFieldFilled = Object.values(config).some((v) => v.trim() !== '')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Connect {integration.display_name || integration.name}
            </DialogTitle>
            <DialogDescription>
              Enter your credentials to connect this integration.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={config[field.key] || ''}
                  onChange={(e) => {
                    setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                    // Reset test status when config changes
                    if (testStatus !== 'idle') {
                      setTestStatus('idle')
                      setTestMessage('')
                    }
                  }}
                />
              </div>
            ))}

            {/* Test Result Alert */}
            {testStatus !== 'idle' && testStatus !== 'testing' && (
              <Alert variant={testStatus === 'success' ? 'default' : 'destructive'}>
                <div className="flex items-center gap-2">
                  {testStatus === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testMessage}</AlertDescription>
                </div>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={!isAnyFieldFilled || testStatus === 'testing' || connectIntegration.isPending}
              className="sm:mr-auto"
            >
              {testStatus === 'testing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={connectIntegration.isPending || testStatus === 'testing'}
            >
              {connectIntegration.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
