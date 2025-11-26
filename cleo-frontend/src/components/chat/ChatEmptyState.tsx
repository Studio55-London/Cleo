import { MessageSquare } from 'lucide-react'

interface ChatEmptyStateProps {
  title?: string
  description?: string
}

export function ChatEmptyState({
  title = 'Upload documents and start asking questions.',
  description = 'Your conversation will appear here.',
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-background-secondary">
        <MessageSquare className="w-10 h-10 text-foreground-tertiary" />
      </div>
      <p className="text-lg text-foreground-secondary text-center mb-2">{title}</p>
      <p className="text-sm text-foreground-tertiary text-center">{description}</p>
    </div>
  )
}
