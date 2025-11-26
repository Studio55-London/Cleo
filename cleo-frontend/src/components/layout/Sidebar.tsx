import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  MessageSquare,
  Users,
  BookOpen,
  Plug,
  Plus,
  Sparkles,
  Wand2,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useSpaces } from '@/api'
import { CreateSpaceModal } from '@/components/spaces'
import type { Space } from '@/types'

export function Sidebar() {
  const location = useLocation()
  const { spaceId } = useParams()
  const { data: spaces, isLoading } = useSpaces()
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)

  return (
    <aside className="w-sidebar flex flex-col border-r border-border bg-background">
      {/* Brand Header */}
      <div className="p-6 border-b border-border-light">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">Cleo</span>
        </Link>
      </div>

      {/* Spaces Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Spaces
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCreateSpaceOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1">
            {isLoading ? (
              <SpaceListSkeleton />
            ) : (
              spaces?.map((space) => (
                <SpaceItem
                  key={space.id}
                  space={space}
                  isActive={spaceId === space.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Navigation Section */}
      <nav className="p-3">
        <NavItem
          to="/agents"
          icon={Users}
          label="Agents"
          isActive={location.pathname === '/agents'}
        />
        <NavItem
          to="/skills"
          icon={Wand2}
          label="Skills"
          isActive={location.pathname === '/skills'}
        />
        <NavItem
          to="/tasks"
          icon={CheckSquare}
          label="Tasks"
          isActive={location.pathname === '/tasks'}
        />
        <NavItem
          to="/knowledge"
          icon={BookOpen}
          label="Knowledge"
          isActive={location.pathname === '/knowledge'}
        />
        <NavItem
          to="/integrations"
          icon={Plug}
          label="Integrations"
          isActive={location.pathname === '/integrations'}
        />
      </nav>

      <CreateSpaceModal
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
      />
    </aside>
  )
}

interface SpaceItemProps {
  space: Space
  isActive: boolean
}

function SpaceItem({ space, isActive }: SpaceItemProps) {
  return (
    <Link
      to={`/chat/${space.id}`}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        'hover:bg-background-hover',
        isActive && 'bg-primary-light text-primary font-medium'
      )}
    >
      <MessageSquare className="h-5 w-5 flex-shrink-0" />
      <span className="truncate text-sm">{space.name}</span>
      {space.unread > 0 && (
        <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
          {space.unread}
        </span>
      )}
    </Link>
  )
}

interface NavItemProps {
  to: string
  icon: React.ElementType
  label: string
  isActive: boolean
}

function NavItem({ to, icon: Icon, label, isActive }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        'hover:bg-background-hover',
        isActive && 'bg-primary-light text-primary font-medium'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </Link>
  )
}

function SpaceListSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </>
  )
}
