import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  CreateTaskTemplateInput,
  UpdateTaskTemplateInput,
  ApplyTemplateInput,
  TemplateCategory,
  GetTaskTemplatesResponse,
  GetTaskTemplateResponse,
  CreateTaskTemplateResponse,
  ApplyTemplateResponse,
  GetTemplateCategoriesResponse,
  SeedTemplatesResponse,
} from '@/types'
import { taskKeys } from './useTasks'

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: { spaceId?: number; category?: TemplateCategory }) =>
    [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: number) => [...templateKeys.details(), id] as const,
  categories: () => [...templateKeys.all, 'categories'] as const,
  popular: (limit?: number) =>
    [...templateKeys.all, 'popular', { limit }] as const,
  recent: (limit?: number) =>
    [...templateKeys.all, 'recent', { limit }] as const,
  search: (query: string, spaceId?: number) =>
    [...templateKeys.all, 'search', { query, spaceId }] as const,
}

interface TemplateFilters {
  spaceId?: number
  category?: TemplateCategory
  includeGlobal?: boolean
  activeOnly?: boolean
  limit?: number
}

export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: templateKeys.list(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.spaceId) params.append('space_id', String(filters.spaceId))
      if (filters?.category) params.append('category', filters.category)
      if (filters?.includeGlobal !== undefined)
        params.append('include_global', String(filters.includeGlobal))
      if (filters?.activeOnly !== undefined)
        params.append('active_only', String(filters.activeOnly))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const url = params.toString()
        ? `${ENDPOINTS.TEMPLATES}?${params.toString()}`
        : ENDPOINTS.TEMPLATES
      const response = await apiClient.get<GetTaskTemplatesResponse>(url)
      return response.templates
    },
  })
}

export function useTemplate(id: number | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<GetTaskTemplateResponse>(
        ENDPOINTS.TEMPLATE(id!)
      )
      return response.template
    },
    enabled: !!id,
  })
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: templateKeys.categories(),
    queryFn: async () => {
      const response = await apiClient.get<GetTemplateCategoriesResponse>(
        ENDPOINTS.TEMPLATES_CATEGORIES
      )
      return response.categories
    },
  })
}

export function usePopularTemplates(limit?: number) {
  return useQuery({
    queryKey: templateKeys.popular(limit),
    queryFn: async () => {
      const url = limit
        ? `${ENDPOINTS.TEMPLATES_POPULAR}?limit=${limit}`
        : ENDPOINTS.TEMPLATES_POPULAR
      const response = await apiClient.get<GetTaskTemplatesResponse>(url)
      return response.templates
    },
  })
}

export function useRecentTemplates(limit?: number) {
  return useQuery({
    queryKey: templateKeys.recent(limit),
    queryFn: async () => {
      const url = limit
        ? `${ENDPOINTS.TEMPLATES_RECENT}?limit=${limit}`
        : ENDPOINTS.TEMPLATES_RECENT
      const response = await apiClient.get<GetTaskTemplatesResponse>(url)
      return response.templates
    },
  })
}

export function useSearchTemplates(query: string, spaceId?: number) {
  return useQuery({
    queryKey: templateKeys.search(query, spaceId),
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('q', query)
      if (spaceId) params.append('space_id', String(spaceId))

      const url = `${ENDPOINTS.TEMPLATES_SEARCH}?${params.toString()}`
      const response = await apiClient.get<GetTaskTemplatesResponse>(url)
      return response.templates
    },
    enabled: query.length >= 2,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskTemplateInput) => {
      const response = await apiClient.post<CreateTaskTemplateResponse>(
        ENDPOINTS.TEMPLATES,
        input
      )
      return response.template
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.categories() })
      if (template.space_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.list({ spaceId: template.space_id }),
        })
      }
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateTaskTemplateInput
    }) => {
      const response = await apiClient.put<GetTaskTemplateResponse>(
        ENDPOINTS.TEMPLATE(id),
        data
      )
      return response.template
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.categories() })
      queryClient.setQueryData(templateKeys.detail(template.id), template)
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.TEMPLATE(id))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.categories() })
    },
  })
}

export function useApplyTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      input,
    }: {
      templateId: number
      input: ApplyTemplateInput
    }) => {
      const response = await apiClient.post<ApplyTemplateResponse>(
        ENDPOINTS.TEMPLATE_APPLY(templateId),
        input
      )
      return response.task
    },
    onSuccess: (task) => {
      // Invalidate both template and task queries
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.popular() })
      queryClient.invalidateQueries({ queryKey: templateKeys.recent() })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.space(task.space_id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() })
    },
  })
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      newName,
    }: {
      templateId: number
      newName?: string
    }) => {
      const response = await apiClient.post<CreateTaskTemplateResponse>(
        ENDPOINTS.TEMPLATE_DUPLICATE(templateId),
        newName ? { name: newName } : {}
      )
      return response.template
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.categories() })
    },
  })
}

export function useSeedTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SeedTemplatesResponse>(
        ENDPOINTS.TEMPLATES_SEED,
        {}
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.categories() })
      queryClient.invalidateQueries({ queryKey: templateKeys.popular() })
    },
  })
}
