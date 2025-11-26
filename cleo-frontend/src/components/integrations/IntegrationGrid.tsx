import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { IntegrationCard } from './IntegrationCard'
import type { Integration, IntegrationCategory } from '@/types'

const categoryOrder: (IntegrationCategory | 'other')[] = [
  'productivity',
  'communication',
  'calendar',
  'other',
]

const categoryLabels: Record<IntegrationCategory | 'other', string> = {
  productivity: 'Productivity',
  communication: 'Communication',
  calendar: 'Calendar & Scheduling',
  other: 'Other',
}

interface IntegrationGridProps {
  integrations: Integration[] | undefined
  isLoading: boolean
  filterCategory?: IntegrationCategory | 'all'
  filterStatus?: 'all' | 'connected' | 'disconnected'
  searchQuery?: string
  onConnect: (integration: Integration) => void
  onDisconnect: (integration: Integration) => void
  onConfigure: (integration: Integration) => void
  onTest: (integration: Integration) => void
}

export function IntegrationGrid({
  integrations,
  isLoading,
  filterCategory = 'all',
  filterStatus = 'all',
  searchQuery = '',
  onConnect,
  onDisconnect,
  onConfigure,
  onTest,
}: IntegrationGridProps) {
  if (isLoading) {
    return <IntegrationGridSkeleton />
  }

  const filteredIntegrations = integrations?.filter((integration) => {
    const matchesCategory =
      filterCategory === 'all' || integration.category === filterCategory
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'connected' && integration.status === 'connected') ||
      (filterStatus === 'disconnected' && integration.status !== 'connected')
    const matchesSearch =
      searchQuery === '' ||
      (integration.display_name || integration.name)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      integration.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesStatus && matchesSearch
  })

  const groupedIntegrations = categoryOrder.reduce(
    (acc, category) => {
      const categoryIntegrations = filteredIntegrations?.filter(
        (i) => (i.category || 'other') === category
      ) || []
      if (categoryIntegrations.length > 0) {
        acc[category] = categoryIntegrations
      }
      return acc
    },
    {} as Record<string, Integration[]>
  )

  if (!filteredIntegrations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-foreground-secondary">No integrations found</p>
        {searchQuery && (
          <p className="text-sm text-foreground-tertiary mt-1">
            Try adjusting your search or filters
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => {
        const categoryIntegrations = groupedIntegrations[category]
        if (!categoryIntegrations?.length) return null

        return (
          <div key={category}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-tertiary mb-4">
              {categoryLabels[category]} ({categoryIntegrations.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  onConfigure={onConfigure}
                  onTest={onTest}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function IntegrationGridSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((section) => (
        <div key={section}>
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((card) => (
              <Card key={card}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-24 mb-2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-2/3 mt-1" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border-light">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
