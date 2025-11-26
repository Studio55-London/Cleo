import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SkillGrid,
  CreateSkillModal,
  EditSkillModal,
  DeleteSkillDialog,
} from '@/components/skills'
import { useSkills, useToggleSkillActive, useSkillCategories } from '@/api'
import type { Skill, SkillCategory } from '@/types'

type FilterCategory = SkillCategory | 'all'
type FilterScope = 'all' | 'global' | 'agent'

export function SkillsPage() {
  const { data: skills, isLoading } = useSkills()
  const { data: categories } = useSkillCategories()
  const toggleActive = useToggleSkillActive()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [filterScope, setFilterScope] = useState<FilterScope>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null)

  const handleToggleActive = async (skill: Skill) => {
    try {
      await toggleActive.mutateAsync({
        id: skill.id,
        is_active: !skill.is_active,
      })
    } catch (error) {
      console.error('Failed to toggle skill active state:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Skills</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Manage skills that guide agent behavior
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Skill
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterCategory}
            onValueChange={(v) => setFilterCategory(v as FilterCategory)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(categories || []).map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterScope}
            onValueChange={(v) => setFilterScope(v as FilterScope)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              <SelectItem value="global">Global Only</SelectItem>
              <SelectItem value="agent">Agent-specific</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Skill Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <SkillGrid
            skills={skills}
            isLoading={isLoading}
            filterCategory={filterCategory}
            filterScope={filterScope}
            searchQuery={searchQuery}
            onEdit={setEditingSkill}
            onDelete={setDeletingSkill}
            onToggleActive={handleToggleActive}
          />
        </div>
      </ScrollArea>

      {/* Modals */}
      <CreateSkillModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
      <EditSkillModal
        open={!!editingSkill}
        onOpenChange={(open) => !open && setEditingSkill(null)}
        skill={editingSkill}
      />
      <DeleteSkillDialog
        open={!!deletingSkill}
        onOpenChange={(open) => !open && setDeletingSkill(null)}
        skill={deletingSkill}
      />
    </div>
  )
}
