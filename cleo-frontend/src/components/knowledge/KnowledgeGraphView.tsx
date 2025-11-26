import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useKnowledgeGraph } from '@/api'
import type { EntityType } from '@/types'

const entityTypeColors: Record<EntityType, string> = {
  person: 'bg-blue-500/10 text-blue-600',
  organization: 'bg-purple-500/10 text-purple-600',
  location: 'bg-green-500/10 text-green-600',
  concept: 'bg-yellow-500/10 text-yellow-600',
  event: 'bg-red-500/10 text-red-600',
  product: 'bg-orange-500/10 text-orange-600',
  other: 'bg-gray-500/10 text-gray-600',
}

export function KnowledgeGraphView() {
  const { data: graph, isLoading } = useKnowledgeGraph()

  if (isLoading) {
    return <KnowledgeGraphSkeleton />
  }

  if (!graph || (graph.entities.length === 0 && graph.relations.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-foreground-secondary">No knowledge graph data</p>
        <p className="text-sm text-foreground-tertiary mt-1">
          Upload documents to build your knowledge graph
        </p>
      </div>
    )
  }

  // Group entities by type
  const entitiesByType = graph.entities.reduce(
    (acc, entity) => {
      const type = entity.type || 'other'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(entity)
      return acc
    },
    {} as Record<string, typeof graph.entities>
  )

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Entities" value={graph.entities.length} />
        <StatCard title="Relations" value={graph.relations.length} />
        <StatCard
          title="Entity Types"
          value={Object.keys(entitiesByType).length}
        />
        <StatCard
          title="Avg Relations"
          value={
            graph.entities.length > 0
              ? Math.round((graph.relations.length * 2) / graph.entities.length)
              : 0
          }
        />
      </div>

      {/* Entity List by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entities by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-6">
              {Object.entries(entitiesByType).map(([type, entities]) => (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'capitalize',
                        entityTypeColors[type as EntityType]
                      )}
                    >
                      {type}
                    </Badge>
                    <span className="text-sm text-foreground-secondary">
                      ({entities.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entities.slice(0, 20).map((entity) => (
                      <Badge
                        key={entity.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {entity.name}
                        {entity.mention_count > 1 && (
                          <span className="ml-1 text-foreground-tertiary">
                            ({entity.mention_count})
                          </span>
                        )}
                      </Badge>
                    ))}
                    {entities.length > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{entities.length - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-foreground-secondary">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function KnowledgeGraphSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-5 w-20 mb-3" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-6 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
