import { useCallback, useState } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface Document {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
}

export function DocumentsPanel() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFiles = async (files: File[]) => {
    setIsUploading(true)
    // Simulate upload - in real implementation, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newDocs: Document[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }))

    setDocuments(prev => [...prev, ...newDocs])
    setIsUploading(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Documents Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
          Documents ({documents.length})
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">No documents yet</p>
            <p className="text-xs text-foreground-tertiary mt-1">
              Upload documents to use in your conversations
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background-secondary"
              >
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-foreground-tertiary">
                    {formatFileSize(doc.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeDocument(doc.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Drop Zone */}
      <div className="p-4 border-t border-border">
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary-light'
              : 'border-border hover:border-primary/50 hover:bg-background-hover'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <>
              <Upload className="h-8 w-8 mb-2 text-foreground-tertiary" />
              <p className="text-sm text-foreground-secondary">Drop files here</p>
              <p className="text-xs text-foreground-tertiary">or click to browse</p>
            </>
          )}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>
    </div>
  )
}
