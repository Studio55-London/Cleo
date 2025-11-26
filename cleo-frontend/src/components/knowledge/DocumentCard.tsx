import { FileText, Trash2, MoreHorizontal, Download, Eye } from 'lucide-react'
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
import type { Document, DocumentStatus } from '@/types'

const statusColors: Record<DocumentStatus, string> = {
  processing: 'bg-yellow-500/10 text-yellow-600',
  ready: 'bg-green-500/10 text-green-600',
  error: 'bg-red-500/10 text-red-600',
}

const statusLabels: Record<DocumentStatus, string> = {
  processing: 'Processing',
  ready: 'Ready',
  error: 'Error',
}

interface DocumentCardProps {
  document: Document
  onDelete: (document: Document) => void
  onView?: (document: Document) => void
}

export function DocumentCard({ document, onDelete, onView }: DocumentCardProps) {
  const fileIcon = getFileIcon(document.file_type)

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {fileIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate">{document.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', statusColors[document.status])}
                  >
                    {statusLabels[document.status]}
                  </Badge>
                  <span className="text-xs text-foreground-tertiary">
                    {document.size}
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(document)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(document)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-foreground-secondary">
              <span>{document.chunks} chunks</span>
              <span>{document.entities} entities</span>
              <span>
                {document.uploaded_at
                  ? new Date(document.uploaded_at).toLocaleDateString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getFileIcon(_fileType: string | null) {
  return <FileText className="h-5 w-5 text-primary" />
}
