import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { PanelType } from './IconRail'

import { ConversationsPanel } from './panels/ConversationsPanel'
import { HistoryPanel } from './panels/HistoryPanel'
import { SpacesPanel } from './panels/SpacesPanel'
import { AgentsPanel } from './panels/AgentsPanel'
import { SkillsPanel } from './panels/SkillsPanel'
import { DocumentsPanel } from './panels/DocumentsPanel'
import { TopicsPanel } from './panels/TopicsPanel'
import { TasksPanel } from './panels/TasksPanel'
import { SettingsPanel } from './panels/SettingsPanel'

interface ContextPanelProps {
  isOpen: boolean
  panelType: PanelType | null
  onClose: () => void
}

const panelTitles: Record<PanelType, string> = {
  conversations: 'Conversations',
  history: 'History',
  spaces: 'Spaces',
  agents: 'Agents',
  skills: 'Skills',
  documents: 'Upload Documents',
  topics: 'Topics',
  tasks: 'Tasks',
  settings: 'Settings',
}

export function ContextPanel({ isOpen, panelType, onClose }: ContextPanelProps) {
  if (!panelType) return null

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-background overflow-hidden transition-all duration-200 ease-out',
        isOpen ? 'w-[280px]' : 'w-0'
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
        <h2 className="font-semibold text-foreground">{panelTitles[panelType]}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {panelType === 'conversations' && <ConversationsPanel />}
        {panelType === 'history' && <HistoryPanel />}
        {panelType === 'spaces' && <SpacesPanel />}
        {panelType === 'agents' && <AgentsPanel />}
        {panelType === 'skills' && <SkillsPanel />}
        {panelType === 'documents' && <DocumentsPanel />}
        {panelType === 'topics' && <TopicsPanel />}
        {panelType === 'tasks' && <TasksPanel />}
        {panelType === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  )
}
