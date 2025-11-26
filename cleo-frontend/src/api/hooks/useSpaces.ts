import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  CreateSpaceInput,
  UpdateSpaceInput,
  GetSpacesResponse,
  GetSpaceResponse,
  CreateSpaceResponse,
} from '@/types'

export const spaceKeys = {
  all: ['spaces'] as const,
  lists: () => [...spaceKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...spaceKeys.lists(), filters] as const,
  details: () => [...spaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...spaceKeys.details(), id] as const,
}

export function useSpaces() {
  return useQuery({
    queryKey: spaceKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<GetSpacesResponse>(ENDPOINTS.SPACES)
      return response.spaces
    },
  })
}

export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: spaceKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<GetSpaceResponse>(
        ENDPOINTS.SPACE(id!)
      )
      return response.space
    },
    enabled: !!id,
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSpaceInput) => {
      const response = await apiClient.post<CreateSpaceResponse>(
        ENDPOINTS.SPACES,
        input
      )
      return response.space
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() })
    },
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateSpaceInput
    }) => {
      const response = await apiClient.put<GetSpaceResponse>(
        ENDPOINTS.SPACE(id),
        data
      )
      return response.space
    },
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() })
      queryClient.setQueryData(spaceKeys.detail(space.id), space)
    },
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ENDPOINTS.SPACE(id))
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() })
      queryClient.removeQueries({ queryKey: spaceKeys.detail(id) })
    },
  })
}

export function useAddAgentToSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      agentId,
    }: {
      spaceId: string
      agentId: number
    }) => {
      const response = await apiClient.post<GetSpaceResponse>(
        ENDPOINTS.SPACE_AGENTS(spaceId),
        { agent_ids: [agentId] } // Flask expects agent_ids array
      )
      return response.space
    },
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() })
      queryClient.setQueryData(spaceKeys.detail(space.id), space)
    },
  })
}

export function useRemoveAgentFromSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      agentId,
    }: {
      spaceId: string
      agentId: number
    }) => {
      const response = await apiClient.delete<GetSpaceResponse>(
        ENDPOINTS.SPACE_AGENT(spaceId, agentId)
      )
      return response.space
    },
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() })
      queryClient.setQueryData(spaceKeys.detail(space.id), space)
    },
  })
}

export function useSetMasterAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      agentId,
    }: {
      spaceId: string
      agentId: number | null
    }) => {
      const response = await apiClient.put<GetSpaceResponse>(
        ENDPOINTS.SPACE_MASTER_AGENT(spaceId),
        { agent_id: agentId }
      )
      return response.space
    },
    onSuccess: (space) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() })
      queryClient.setQueryData(spaceKeys.detail(space.id), space)
    },
  })
}
