import { FolderOpen, Trash2, MoreHorizontal, Edit, FileText } from 'lucide-react'
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
import type { KnowledgeBase } from '@/types'

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase
  onSelect: (kb: KnowledgeBase) => void
  onEdit?: (kb: KnowledgeBase) => void
  onDelete?: (kb: KnowledgeBase) => void
  isSelected?: boolean
}

export function KnowledgeBaseCard({
  knowledgeBase,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
}: KnowledgeBaseCardProps) {
  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onSelect(knowledgeBase)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate">{knowledgeBase.name}</h3>
                {knowledgeBase.description && (
                  <p className="text-xs text-foreground-secondary mt-0.5 line-clamp-2">
                    {knowledgeBase.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {knowledgeBase.is_default && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                      Default
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-foreground-tertiary">
                    <FileText className="h-3 w-3" />
                    <span>{knowledgeBase.document_count} documents</span>
                  </div>
                </div>
              </div>
              {(onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(knowledgeBase)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onEdit && onDelete && <DropdownMenuSeparator />}
                    {onDelete && !knowledgeBase.is_default && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(knowledgeBase)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-foreground-tertiary">
              {knowledgeBase.space_name && (
                <span>Space: {knowledgeBase.space_name}</span>
              )}
              <span>
                {knowledgeBase.created_at
                  ? new Date(knowledgeBase.created_at).toLocaleDateString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
