import { Link } from 'react-router-dom'
import { Wand2, Globe, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useSkills } from '@/api'
import type { Skill, SkillCategory } from '@/types'

const categoryColors: Partial<Record<SkillCategory, string>> = {
  productivity: 'text-blue-600 bg-blue-100',
  communication: 'text-green-600 bg-green-100',
  analysis: 'text-purple-600 bg-purple-100',
  coordination: 'text-orange-600 bg-orange-100',
  planning: 'text-indigo-600 bg-indigo-100',
  research: 'text-cyan-600 bg-cyan-100',
  writing: 'text-pink-600 bg-pink-100',
  finance: 'text-emerald-600 bg-emerald-100',
  legal: 'text-amber-600 bg-amber-100',
  marketing: 'text-rose-600 bg-rose-100',
  technical: 'text-slate-600 bg-slate-100',
  other: 'text-gray-600 bg-gray-100',
}

export function SkillsPanel() {
  const { data: skills, isLoading } = useSkills()

  // Separate global and agent-specific skills
  const globalSkills = skills?.filter(s => s.is_global) || []
  const agentSkills = skills?.filter(s => !s.is_global) || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
          Your Skills ({skills?.length || 0})
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <SkillsSkeleton />
        ) : !skills || skills.length === 0 ? (
          <div className="text-center py-8">
            <Wand2 className="h-10 w-10 mx-auto mb-3 text-foreground-tertiary" />
            <p className="text-sm text-foreground-secondary">No skills yet</p>
            <p className="text-xs text-foreground-tertiary mt-1">
              Create skills to enhance your agents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Global Skills */}
            {globalSkills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-2 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Global Skills ({globalSkills.length})
                </h4>
                <div className="space-y-2">
                  {globalSkills.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </div>
              </div>
            )}

            {/* Agent-Specific Skills */}
            {agentSkills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Agent Skills ({agentSkills.length})
                </h4>
                <div className="space-y-2">
                  {agentSkills.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* View All / Manage Button */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="outline" asChild>
          <Link to="/skills">
            <Wand2 className="h-4 w-4 mr-2" />
            Manage Skills
          </Link>
        </Button>
      </div>
    </div>
  )
}

interface SkillCardProps {
  skill: Skill
}

function SkillCard({ skill }: SkillCardProps) {
  const category = skill.category || 'other'
  const categoryColor = categoryColors[category] || categoryColors.other

  return (
    <Link
      to="/skills"
      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background-hover transition-colors"
    >
      <div className={cn(
        'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
        skill.is_global ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
      )}>
        <Wand2 className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{skill.display_name}</p>
          {!skill.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className={cn('text-xs capitalize', categoryColor)}>
            {category}
          </Badge>
          {skill.agent_name && (
            <span className="text-xs text-foreground-tertiary truncate">
              {skill.agent_name}
            </span>
          )}
        </div>
        {skill.description && (
          <p className="text-xs text-foreground-tertiary truncate mt-0.5">
            {skill.description}
          </p>
        )}
      </div>
    </Link>
  )
}

function SkillsSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-3 w-24 mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
