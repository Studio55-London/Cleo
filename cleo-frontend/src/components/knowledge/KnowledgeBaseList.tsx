import { FolderOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { KnowledgeBaseCard } from './KnowledgeBaseCard'
import type { KnowledgeBase } from '@/types'

interface KnowledgeBaseListProps {
  knowledgeBases?: KnowledgeBase[]
  isLoading?: boolean
  searchQuery?: string
  selectedId?: number
  onSelect: (kb: KnowledgeBase) => void
  onEdit?: (kb: KnowledgeBase) => void
  onDelete?: (kb: KnowledgeBase) => void
}

export function KnowledgeBaseList({
  knowledgeBases,
  isLoading,
  searchQuery,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: KnowledgeBaseListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  const filteredKBs = knowledgeBases?.filter((kb) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      kb.name.toLowerCase().includes(query) ||
      kb.description?.toLowerCase().includes(query)
    )
  })

  if (!filteredKBs || filteredKBs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-foreground-secondary">
        <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">
          {searchQuery
            ? 'No knowledge bases match your search'
            : 'No knowledge bases yet'}
        </p>
        <p className="text-xs mt-1">
          {searchQuery
            ? 'Try a different search term'
            : 'Create one to organize your documents'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredKBs.map((kb) => (
        <KnowledgeBaseCard
          key={kb.id}
          knowledgeBase={kb}
          isSelected={selectedId === kb.id}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
