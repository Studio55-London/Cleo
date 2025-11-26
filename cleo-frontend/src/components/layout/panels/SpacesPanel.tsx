import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layers, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useSpaces } from '@/api'
import { CreateSpaceModal } from '@/components/spaces'

export function SpacesPanel() {
  const { spaceId } = useParams()
  const { data: spaces, isLoading } = useSpaces()
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
          Your Spaces
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <SpacesSkeleton />
        ) : spaces?.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">No spaces yet</p>
            <p className="text-xs text-foreground-tertiary mt-1">
              Create a space to organize your conversations
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {spaces?.map((space) => (
              <Link
                key={space.id}
                to={`/chat/${space.id}`}
                className={cn(
                  'block p-3 rounded-lg border border-border transition-colors',
                  'hover:bg-background-hover hover:border-border',
                  spaceId === space.id && 'bg-primary-light border-primary/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{space.name}</p>
                    {space.description && (
                      <p className="text-xs text-foreground-tertiary truncate mt-0.5">
                        {space.description}
                      </p>
                    )}
                  </div>
                  {space.unread > 0 && (
                    <Badge variant="default" className="text-xs">
                      {space.unread}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-foreground-tertiary">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {space.agents?.length || 0} agents
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Button */}
      <div className="p-4 border-t border-border">
        <Button
          className="w-full"
          onClick={() => setCreateSpaceOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Space
        </Button>
      </div>

      <CreateSpaceModal
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
      />
    </div>
  )
}

function SpacesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-border">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
