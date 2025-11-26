import { Link } from 'react-router-dom'
import {
  MessageSquare,
  History,
  Layers,
  Upload,
  Bookmark,
  ListTodo,
  Settings,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type PanelType = 'conversations' | 'history' | 'spaces' | 'agents' | 'skills' | 'documents' | 'topics' | 'tasks' | 'settings'

interface IconRailProps {
  activePanel: PanelType | null
  onPanelChange: (panel: PanelType | null) => void
}

interface NavIconProps {
  icon: React.ElementType
  label: string
  panel: PanelType
  activePanel: PanelType | null
  onClick: () => void
}

function NavIcon({ icon: Icon, label, panel, activePanel, onClick }: NavIconProps) {
  const isActive = activePanel === panel

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150',
            'hover:bg-background-hover hover:scale-105',
            isActive && 'bg-primary text-primary-foreground hover:bg-primary-hover'
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function IconRail({ activePanel, onPanelChange }: IconRailProps) {

  const handlePanelClick = (panel: PanelType) => {
    if (activePanel === panel) {
      onPanelChange(null)
    } else {
      onPanelChange(panel)
    }
  }

  const navItems: { icon: React.ElementType; label: string; panel: PanelType }[] = [
    { icon: MessageSquare, label: 'Conversations', panel: 'conversations' },
    { icon: History, label: 'History', panel: 'history' },
    { icon: Layers, label: 'Spaces', panel: 'spaces' },
    { icon: Users, label: 'Agents', panel: 'agents' },
    { icon: Wand2, label: 'Skills', panel: 'skills' },
    { icon: Upload, label: 'Upload Documents', panel: 'documents' },
    { icon: Bookmark, label: 'Topics', panel: 'topics' },
    { icon: ListTodo, label: 'Tasks', panel: 'tasks' },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-14 flex flex-col items-center py-4 bg-background-secondary border-r border-border">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center justify-center w-10 h-10 mb-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          <Sparkles className="h-5 w-5" />
        </Link>

        {/* Navigation Icons */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <NavIcon
              key={item.panel}
              icon={item.icon}
              label={item.label}
              panel={item.panel}
              activePanel={activePanel}
              onClick={() => handlePanelClick(item.panel)}
            />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2">
          {/* Settings */}
          <NavIcon
            icon={Settings}
            label="Settings"
            panel="settings"
            activePanel={activePanel}
            onClick={() => handlePanelClick('settings')}
          />

          {/* User Avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="mt-2">
                <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    AS
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Profile
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
