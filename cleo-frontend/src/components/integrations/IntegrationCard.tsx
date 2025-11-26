import {
  MoreHorizontal,
  Settings,
  Unplug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Integration, IntegrationStatus } from '@/types'

const statusConfig: Record<
  IntegrationStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  connected: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Connected',
  },
  disconnected: {
    icon: XCircle,
    color: 'text-foreground-tertiary',
    label: 'Disconnected',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    label: 'Error',
  },
}

interface IntegrationCardProps {
  integration: Integration
  onConnect: (integration: Integration) => void
  onDisconnect: (integration: Integration) => void
  onConfigure: (integration: Integration) => void
  onTest: (integration: Integration) => void
}

export function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
  onTest,
}: IntegrationCardProps) {
  const status = statusConfig[integration.status]
  const StatusIcon = status.icon
  const isConnected = integration.status === 'connected'

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">
              {getIntegrationIcon(integration.name)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-base">
                  {integration.display_name || integration.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusIcon className={cn('h-4 w-4', status.color)} />
                  <span
                    className={cn(
                      'text-xs',
                      isConnected
                        ? 'text-green-600'
                        : 'text-foreground-secondary'
                    )}
                  >
                    {status.label}
                  </span>
                  {integration.category && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {integration.category}
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isConnected ? (
                    <>
                      <DropdownMenuItem onClick={() => onConfigure(integration)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTest(integration)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDisconnect(integration)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Unplug className="h-4 w-4 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => onConnect(integration)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Connect
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-sm text-foreground-secondary mt-2 line-clamp-2">
              {integration.description || 'No description available'}
            </p>

            {integration.last_sync && isConnected && (
              <p className="text-xs text-foreground-tertiary mt-2">
                Last synced: {new Date(integration.last_sync).toLocaleString()}
              </p>
            )}

            {integration.error_message && integration.status === 'error' && (
              <p className="text-xs text-red-500 mt-2">
                Error: {integration.error_message}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-border-light">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onConfigure(integration)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={() => onConnect(integration)}
            >
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getIntegrationIcon(name: string): string {
  const icons: Record<string, string> = {
    slack: '💬',
    gmail: '📧',
    'google-calendar': '📅',
    'google-drive': '📁',
    notion: '📝',
    trello: '📋',
    github: '🐙',
    jira: '🎯',
    discord: '🎮',
    teams: '👥',
  }
  return icons[name.toLowerCase()] || '🔌'
}
