import { useMemo, useState } from 'react'
import { FileText, Plus, Search, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateCard } from './TemplateCard'
import type { TaskTemplate } from '@/types'

interface TemplateGridProps {
  templates: TaskTemplate[] | undefined
  popularTemplates?: TaskTemplate[]
  recentTemplates?: TaskTemplate[]
  categories?: string[]
  isLoading: boolean
  onApply: (template: TaskTemplate) => void
  onEdit?: (template: TaskTemplate) => void
  onDuplicate?: (template: TaskTemplate) => void
  onDelete?: (template: TaskTemplate) => void
  onCreateNew?: () => void
  onSeedTemplates?: () => void
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  )
}

export function TemplateGrid({
  templates,
  popularTemplates,
  recentTemplates,
  categories,
  isLoading,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onCreateNew,
  onSeedTemplates,
}: TemplateGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredTemplates = useMemo(() => {
    if (!templates) return []

    let filtered = templates

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query)
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }

    return filtered
  }, [templates, searchQuery, selectedCategory])

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, TaskTemplate[]> = {}

    filteredTemplates.forEach((template) => {
      const category = template.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(template)
    })

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredTemplates])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const isEmpty = !templates || templates.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create templates to quickly add common tasks
          </p>
          <div className="flex gap-2">
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
            {onSeedTemplates && (
              <Button variant="outline" onClick={onSeedTemplates}>
                <Sparkles className="h-4 w-4 mr-2" />
                Add Default Templates
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="all">All</TabsTrigger>
            {popularTemplates && popularTemplates.length > 0 && (
              <TabsTrigger value="popular">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Popular
              </TabsTrigger>
            )}
            {recentTemplates && recentTemplates.length > 0 && (
              <TabsTrigger value="recent">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Recent
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="all" className="mt-0">
              {categories && categories.length > 0 && (
                <div className="flex gap-2 px-4 pt-4 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              )}

              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <p className="text-muted-foreground">No templates match your search</p>
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  {groupedByCategory.map(([category, categoryTemplates]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryTemplates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onApply={onApply}
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {popularTemplates && (
              <TabsContent value="popular" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {popularTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={onApply}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </TabsContent>
            )}

            {recentTemplates && (
              <TabsContent value="recent" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {recentTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={onApply}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      )}
    </div>
  )
}
