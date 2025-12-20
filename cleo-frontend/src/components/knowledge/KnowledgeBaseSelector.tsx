import { Check, ChevronsUpDown, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { KnowledgeBase } from '@/types'
import { useState } from 'react'

interface KnowledgeBaseSelectorProps {
  knowledgeBases: KnowledgeBase[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  placeholder?: string
  disabled?: boolean
  multiSelect?: boolean
}

export function KnowledgeBaseSelector({
  knowledgeBases,
  selectedIds,
  onSelectionChange,
  placeholder = 'Select knowledge bases...',
  disabled = false,
  multiSelect = true,
}: KnowledgeBaseSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedKBs = knowledgeBases.filter((kb) => selectedIds.includes(kb.id))

  const handleSelect = (kb: KnowledgeBase) => {
    if (multiSelect) {
      if (selectedIds.includes(kb.id)) {
        onSelectionChange(selectedIds.filter((id) => id !== kb.id))
      } else {
        onSelectionChange([...selectedIds, kb.id])
      }
    } else {
      onSelectionChange([kb.id])
      setOpen(false)
    }
  }

  const handleRemove = (kbId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange(selectedIds.filter((id) => id !== kbId))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selectedKBs.length > 0 ? (
              selectedKBs.map((kb) => (
                <Badge
                  key={kb.id}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => handleRemove(kb.id, e)}
                >
                  {kb.name}
                  <span className="ml-1 text-foreground-tertiary hover:text-foreground">
                    ×
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-foreground-tertiary">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search knowledge bases..." />
          <CommandList>
            <CommandEmpty>No knowledge bases found.</CommandEmpty>
            <CommandGroup>
              {knowledgeBases.map((kb) => (
                <CommandItem
                  key={kb.id}
                  value={kb.name}
                  onSelect={() => handleSelect(kb)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {multiSelect ? (
                      <Checkbox
                        checked={selectedIds.includes(kb.id)}
                        className="mr-1"
                      />
                    ) : (
                      <Check
                        className={cn(
                          'h-4 w-4',
                          selectedIds.includes(kb.id)
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                    )}
                    <FolderOpen className="h-4 w-4 text-foreground-tertiary" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{kb.name}</span>
                      {kb.space_name && (
                        <span className="text-xs text-foreground-tertiary ml-2">
                          in {kb.space_name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-foreground-tertiary">
                      {kb.document_count} docs
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
