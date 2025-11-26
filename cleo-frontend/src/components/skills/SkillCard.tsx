import { MoreHorizontal, Edit, Trash2, Power, PowerOff, Globe, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Skill, SkillCategory } from '@/types'

const categoryColors: Record<SkillCategory, string> = {
  productivity: 'bg-blue-500/10 text-blue-600',
  communication: 'bg-green-500/10 text-green-600',
  analysis: 'bg-purple-500/10 text-purple-600',
  coordination: 'bg-orange-500/10 text-orange-600',
  planning: 'bg-indigo-500/10 text-indigo-600',
  research: 'bg-cyan-500/10 text-cyan-600',
  writing: 'bg-pink-500/10 text-pink-600',
  finance: 'bg-emerald-500/10 text-emerald-600',
  legal: 'bg-amber-500/10 text-amber-600',
  marketing: 'bg-rose-500/10 text-rose-600',
  technical: 'bg-slate-500/10 text-slate-600',
  other: 'bg-gray-500/10 text-gray-600',
}

interface SkillCardProps {
  skill: Skill
  onEdit: (skill: Skill) => void
  onDelete: (skill: Skill) => void
  onToggleActive: (skill: Skill) => void
}

export function SkillCard({
  skill,
  onEdit,
  onDelete,
  onToggleActive,
}: SkillCardProps) {
  const isActive = skill.is_active

  return (
    <Card className={cn('transition-all hover:shadow-md', !isActive && 'opacity-60')}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">{skill.display_name}</h3>
            {skill.is_global ? (
              <Globe className="h-4 w-4 text-foreground-tertiary flex-shrink-0" aria-label="Global Skill" />
            ) : (
              <User className="h-4 w-4 text-foreground-tertiary flex-shrink-0" aria-label="Agent-specific Skill" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {skill.category && (
              <Badge className={cn('text-xs', categoryColors[skill.category])}>
                {skill.category}
              </Badge>
            )}
            <Badge
              variant={isActive ? 'default' : 'outline'}
              className={cn(
                'text-xs',
                isActive
                  ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                  : 'text-foreground-secondary'
              )}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-xs text-foreground-tertiary">v{skill.version}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(skill)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(skill)}>
              {isActive ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(skill)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary line-clamp-2">
          {skill.description}
        </p>
        {skill.triggers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {skill.triggers.slice(0, 3).map((trigger) => (
              <Badge key={trigger} variant="outline" className="text-xs">
                {trigger}
              </Badge>
            ))}
            {skill.triggers.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{skill.triggers.length - 3} more
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-light">
          <span className="text-xs text-foreground-tertiary">
            {skill.agent_name || 'Global'}
          </span>
          <span className="text-xs text-foreground-tertiary">
            Updated {new Date(skill.updated_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
