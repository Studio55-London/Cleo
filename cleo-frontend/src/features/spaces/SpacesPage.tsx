import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Users, Search, MessageSquare, Globe, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSpaces, useGlobalSpace } from '@/api'
import { CreateSpaceModal } from '@/components/spaces'
import type { Space } from '@/types'

export function SpacesPage() {
  const navigate = useNavigate()
  const { data: spaces, isLoading } = useSpaces()
  const { data: globalSpace, isLoading: globalLoading } = useGlobalSpace()
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Separate global space from regular spaces
  const regularSpaces = spaces?.filter((space: Space) => !space.is_global)

  const filteredSpaces = regularSpaces?.filter((space: Space) =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSpaceClick = (spaceId: string | number) => {
    navigate(`/chat/${spaceId}`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Spaces</h1>
            <p className="text-sm text-foreground-secondary">
              Organize your conversations with different agent configurations
            </p>
          </div>
          <Button onClick={() => setCreateSpaceOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Space
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <Input
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Global Space - Always shown at top */}
          {!searchQuery && (
            <div className="mb-6">
              {globalLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : globalSpace ? (
                <Card
                  className="cursor-pointer hover:border-primary/50 transition-colors border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
                  onClick={() => handleSpaceClick(globalSpace.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Globe className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">Global Space</CardTitle>
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                              All Knowledge
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground-secondary">
                            Access all knowledge bases across all spaces
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-foreground-tertiary">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {globalSpace.knowledge_bases?.length || 0} knowledge bases
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Chat with full context
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          {/* Regular Spaces */}
          <div className="mb-3">
            <h2 className="text-sm font-medium text-foreground-secondary">Your Spaces</h2>
          </div>

          {isLoading ? (
            <SpacesSkeleton />
          ) : filteredSpaces?.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="h-16 w-16 mx-auto mb-4 text-foreground-tertiary" />
              <h3 className="text-lg font-medium mb-2">No spaces found</h3>
              <p className="text-sm text-foreground-secondary mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first space to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateSpaceOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Space
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpaces?.map((space: Space) => (
                <Card
                  key={space.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleSpaceClick(space.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{space.name}</CardTitle>
                          {space.master_agent && (
                            <p className="text-xs text-foreground-tertiary">
                              Master: {space.master_agent.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {space.unread > 0 && (
                        <Badge variant="default">{space.unread}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {space.description && (
                      <CardDescription className="mb-3 line-clamp-2">
                        {space.description}
                      </CardDescription>
                    )}
                    <div className="flex items-center gap-4 text-xs text-foreground-tertiary">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {space.agents?.length || 0} agents
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {space.knowledge_bases?.length || 0} KBs
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateSpaceModal
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
      />
    </div>
  )
}

function SpacesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
