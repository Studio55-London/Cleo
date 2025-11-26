import { useState, useRef, useCallback, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MentionAutocomplete } from './MentionAutocomplete'
import type { Agent } from '@/types'

interface ChatInputProps {
  onSend: (content: string, mentions: string[]) => void
  agents: Agent[]
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  agents,
  disabled = false,
  placeholder = 'Type a message... Use @ to mention an agent',
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)

    // Check for @ mentions
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentions(true)
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }
  }

  const handleMentionSelect = useCallback(
    (agent: Agent) => {
      const cursorPos = textareaRef.current?.selectionStart || 0
      const textBeforeCursor = content.slice(0, cursorPos)
      const textAfterCursor = content.slice(cursorPos)

      // Replace the @query with @AgentName
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
      if (mentionMatch) {
        const newTextBefore = textBeforeCursor.slice(0, -mentionMatch[0].length)
        const newContent = `${newTextBefore}@${agent.name} ${textAfterCursor}`
        setContent(newContent)

        // Track the mention
        if (!selectedMentions.includes(agent.name)) {
          setSelectedMentions([...selectedMentions, agent.name])
        }
      }

      setShowMentions(false)
      setMentionQuery('')
      textareaRef.current?.focus()
    },
    [content, selectedMentions]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }

    if (e.key === 'Escape' && showMentions) {
      setShowMentions(false)
    }
  }

  const handleSubmit = () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || disabled) return

    // Extract mentions from content
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(trimmedContent)) !== null) {
      const agentName = match[1]
      if (agents.some((a) => a.name.toLowerCase() === agentName.toLowerCase())) {
        mentions.push(agentName)
      }
    }

    onSend(trimmedContent, mentions)
    setContent('')
    setSelectedMentions([])

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  return (
    <div className="relative border-t border-border bg-background p-4">
      {/* Mention Autocomplete */}
      {showMentions && filteredAgents.length > 0 && (
        <MentionAutocomplete
          agents={filteredAgents}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentions(false)}
        />
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 min-h-[44px] max-h-[200px] resize-none',
            'focus-visible:ring-1 focus-visible:ring-primary'
          )}
        />
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || disabled}
          size="icon"
          className="h-11 w-11 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hint text */}
      <p className="mt-2 text-xs text-foreground-tertiary">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
