import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  IntegrationGrid,
  ConnectIntegrationDialog,
  DisconnectIntegrationDialog,
} from '@/components/integrations'
import { useIntegrations, useTestIntegration } from '@/api'
import type { Integration, IntegrationCategory } from '@/types'

type FilterCategory = IntegrationCategory | 'all'
type FilterStatus = 'all' | 'connected' | 'disconnected'

export function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations()
  const testIntegration = useTestIntegration()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [connectingIntegration, setConnectingIntegration] = useState<Integration | null>(null)
  const [disconnectingIntegration, setDisconnectingIntegration] = useState<Integration | null>(null)

  const handleTest = async (integration: Integration) => {
    try {
      const result = await testIntegration.mutateAsync(integration.id)
      if (result.success) {
        console.log('Connection test successful:', result.message)
      } else {
        console.error('Connection test failed:', result.message)
      }
    } catch (error) {
      console.error('Failed to test integration:', error)
    }
  }

  // Count connected integrations
  const connectedCount = integrations?.filter(
    (i) => i.status === 'connected'
  ).length || 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Connect your favorite tools and services ({connectedCount}{' '}
              connected)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterCategory}
            onValueChange={(v) => setFilterCategory(v as FilterCategory)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="productivity">Productivity</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="calendar">Calendar</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Integration Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <IntegrationGrid
            integrations={integrations}
            isLoading={isLoading}
            filterCategory={filterCategory}
            filterStatus={filterStatus}
            searchQuery={searchQuery}
            onConnect={setConnectingIntegration}
            onDisconnect={setDisconnectingIntegration}
            onConfigure={setConnectingIntegration}
            onTest={handleTest}
          />
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <ConnectIntegrationDialog
        open={!!connectingIntegration}
        onOpenChange={(open) => !open && setConnectingIntegration(null)}
        integration={connectingIntegration}
      />
      <DisconnectIntegrationDialog
        open={!!disconnectingIntegration}
        onOpenChange={(open) => !open && setDisconnectingIntegration(null)}
        integration={disconnectingIntegration}
      />
    </div>
  )
}
