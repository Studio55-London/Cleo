import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type { Skill, SkillCategory, CreateSkillInput, UpdateSkillInput } from '@/types'

// Flask API response types
interface FlaskSkillsResponse {
  success: boolean
  skills: Skill[]
}

interface FlaskSkillResponse {
  success: boolean
  skill: Skill
}

interface FlaskCategoriesResponse {
  success: boolean
  categories: SkillCategory[]
}

interface FlaskTemplateResponse {
  success: boolean
  template: string
  category: string
}

// Query keys for cache management
export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...skillKeys.lists(), filters] as const,
  details: () => [...skillKeys.all, 'detail'] as const,
  detail: (id: number) => [...skillKeys.details(), id] as const,
  global: () => [...skillKeys.all, 'global'] as const,
  categories: () => [...skillKeys.all, 'categories'] as const,
  template: (category: string) => [...skillKeys.all, 'template', category] as const,
  forAgent: (agentId: number) => [...skillKeys.all, 'agent', agentId] as const,
}

/**
 * Fetch all skills
 */
export function useSkills(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: skillKeys.list(options || {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.activeOnly) {
        params.append('active_only', 'true')
      }
      const url = params.toString()
        ? `${ENDPOINTS.SKILLS}?${params.toString()}`
        : ENDPOINTS.SKILLS
      const response = await apiClient.get<FlaskSkillsResponse>(url)
      return response.skills
    },
  })
}

/**
 * Fetch a single skill by ID
 */
export function useSkill(id: number) {
  return useQuery({
    queryKey: skillKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<FlaskSkillResponse>(
        ENDPOINTS.SKILL(id)
      )
      return response.skill
    },
    enabled: !!id,
  })
}

/**
 * Fetch global skills only
 */
export function useGlobalSkills() {
  return useQuery({
    queryKey: skillKeys.global(),
    queryFn: async () => {
      const response = await apiClient.get<FlaskSkillsResponse>(
        ENDPOINTS.SKILLS_GLOBAL
      )
      return response.skills
    },
  })
}

/**
 * Fetch skill categories
 */
export function useSkillCategories() {
  return useQuery({
    queryKey: skillKeys.categories(),
    queryFn: async () => {
      const response = await apiClient.get<FlaskCategoriesResponse>(
        ENDPOINTS.SKILLS_CATEGORIES
      )
      return response.categories
    },
    staleTime: Infinity, // Categories don't change often
  })
}

/**
 * Fetch a skill template for a given category
 */
export function useSkillTemplate(category: string) {
  return useQuery({
    queryKey: skillKeys.template(category),
    queryFn: async () => {
      const response = await apiClient.get<FlaskTemplateResponse>(
        ENDPOINTS.SKILLS_TEMPLATE(category)
      )
      return response.template
    },
    enabled: !!category,
    staleTime: Infinity, // Templates don't change
  })
}

/**
 * Fetch skills for a specific agent (includes global skills)
 */
export function useAgentSkills(agentId: number) {
  return useQuery({
    queryKey: skillKeys.forAgent(agentId),
    queryFn: async () => {
      const response = await apiClient.get<FlaskSkillsResponse>(
        ENDPOINTS.AGENT_SKILLS(agentId)
      )
      return response.skills
    },
    enabled: !!agentId,
  })
}

/**
 * Create a new skill
 */
export function useCreateSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSkillInput) => {
      const response = await apiClient.post<FlaskSkillResponse>(
        ENDPOINTS.SKILLS,
        input
      )
      return response.skill
    },
    onSuccess: (skill) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all })
      if (skill.agent_id) {
        queryClient.invalidateQueries({
          queryKey: skillKeys.forAgent(skill.agent_id),
        })
      }
    },
  })
}

/**
 * Update an existing skill
 */
export function useUpdateSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateSkillInput & { id: number }) => {
      const response = await apiClient.put<FlaskSkillResponse>(
        ENDPOINTS.SKILL(id),
        input
      )
      return response.skill
    },
    onSuccess: (skill, variables) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
      queryClient.invalidateQueries({ queryKey: skillKeys.global() })
      if (skill.agent_id) {
        queryClient.invalidateQueries({
          queryKey: skillKeys.forAgent(skill.agent_id),
        })
      }
    },
  })
}

/**
 * Delete a skill
 */
export function useDeleteSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.SKILL(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all })
    },
  })
}

/**
 * Assign a skill to an agent
 */
export function useAssignSkillToAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      agentId,
      skillId,
    }: {
      agentId: number
      skillId: number
    }) => {
      const response = await apiClient.post<FlaskSkillResponse>(
        ENDPOINTS.AGENT_SKILLS(agentId),
        { skill_id: skillId }
      )
      return response.skill
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: skillKeys.forAgent(variables.agentId),
      })
      queryClient.invalidateQueries({ queryKey: skillKeys.all })
    },
  })
}

/**
 * Unassign a skill from an agent
 */
export function useUnassignSkillFromAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      agentId,
      skillId,
    }: {
      agentId: number
      skillId: number
    }) => {
      await apiClient.delete(ENDPOINTS.AGENT_SKILL(agentId, skillId))
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: skillKeys.forAgent(variables.agentId),
      })
      queryClient.invalidateQueries({ queryKey: skillKeys.all })
    },
  })
}

/**
 * Toggle skill active state
 */
export function useToggleSkillActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const response = await apiClient.put<FlaskSkillResponse>(
        ENDPOINTS.SKILL(id),
        { is_active }
      )
      return response.skill
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: skillKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() })
    },
  })
}

/**
 * Helper hook to get skills grouped by category
 */
export function useSkillsByCategory() {
  const { data: skills, ...rest } = useSkills()

  const grouped = skills?.reduce(
    (acc, skill) => {
      const category = skill.category || 'other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(skill)
      return acc
    },
    {} as Record<string, Skill[]>
  )

  return { data: grouped, skills, ...rest }
}
