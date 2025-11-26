import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SkillCard } from './SkillCard'
import type { Skill, SkillCategory } from '@/types'

const categoryOrder: SkillCategory[] = [
  'productivity',
  'communication',
  'analysis',
  'coordination',
  'planning',
  'research',
  'writing',
  'finance',
  'legal',
  'marketing',
  'technical',
  'other',
]

interface SkillGridProps {
  skills: Skill[] | undefined
  isLoading: boolean
  filterCategory?: SkillCategory | 'all'
  filterScope?: 'all' | 'global' | 'agent'
  searchQuery?: string
  onEdit: (skill: Skill) => void
  onDelete: (skill: Skill) => void
  onToggleActive: (skill: Skill) => void
}

export function SkillGrid({
  skills,
  isLoading,
  filterCategory = 'all',
  filterScope = 'all',
  searchQuery = '',
  onEdit,
  onDelete,
  onToggleActive,
}: SkillGridProps) {
  if (isLoading) {
    return <SkillGridSkeleton />
  }

  const filteredSkills = skills?.filter((skill) => {
    const matchesCategory = filterCategory === 'all' || skill.category === filterCategory
    const matchesScope =
      filterScope === 'all' ||
      (filterScope === 'global' && skill.is_global) ||
      (filterScope === 'agent' && !skill.is_global)
    const matchesSearch =
      searchQuery === '' ||
      skill.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.triggers.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesScope && matchesSearch
  })

  // Group skills by category
  const groupedSkills = categoryOrder.reduce(
    (acc, category) => {
      const categorySkills = filteredSkills?.filter((s) => s.category === category) || []
      if (categorySkills.length > 0) {
        acc[category] = categorySkills
      }
      return acc
    },
    {} as Record<SkillCategory, Skill[]>
  )

  // Add uncategorized skills
  const uncategorizedSkills = filteredSkills?.filter((s) => !s.category) || []
  if (uncategorizedSkills.length > 0) {
    groupedSkills['other'] = [...(groupedSkills['other'] || []), ...uncategorizedSkills]
  }

  if (!filteredSkills?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-foreground-secondary">No skills found</p>
        {searchQuery && (
          <p className="text-sm text-foreground-tertiary mt-1">
            Try adjusting your search or filters
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => {
        const categorySkills = groupedSkills[category]
        if (!categorySkills?.length) return null

        return (
          <div key={category}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-tertiary mb-4 capitalize">
              {category} ({categorySkills.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SkillGridSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((section) => (
        <div key={section}>
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((card) => (
              <Card key={card}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-1 mt-3">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="mt-4 pt-3 border-t border-border-light flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
