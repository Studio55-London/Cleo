import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { DocumentCard } from './DocumentCard'
import type { Document } from '@/types'

interface DocumentListProps {
  documents: Document[] | undefined
  isLoading: boolean
  searchQuery?: string
  onDelete: (document: Document) => void
  onView?: (document: Document) => void
}

export function DocumentList({
  documents,
  isLoading,
  searchQuery = '',
  onDelete,
  onView,
}: DocumentListProps) {
  if (isLoading) {
    return <DocumentListSkeleton />
  }

  const filteredDocuments = documents?.filter(
    (doc) =>
      searchQuery === '' ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!filteredDocuments?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-foreground-secondary">No documents found</p>
        {searchQuery && (
          <p className="text-sm text-foreground-tertiary mt-1">
            Try adjusting your search
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredDocuments.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  )
}

function DocumentListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="flex gap-4 mt-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
