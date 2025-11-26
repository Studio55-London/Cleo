import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  Integration,
  UpdateIntegrationRequest,
  GetIntegrationsResponse,
  UpdateIntegrationResponse,
  TestIntegrationResponse,
} from '@/types'

export const integrationKeys = {
  all: ['integrations'] as const,
  lists: () => [...integrationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...integrationKeys.lists(), filters] as const,
  details: () => [...integrationKeys.all, 'detail'] as const,
  detail: (id: number) => [...integrationKeys.details(), id] as const,
}

export function useIntegrations() {
  return useQuery({
    queryKey: integrationKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<GetIntegrationsResponse>(
        ENDPOINTS.INTEGRATIONS
      )
      return response.integrations
    },
  })
}

export function useIntegration(id: number) {
  return useQuery({
    queryKey: integrationKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<{ integration: Integration }>(
        ENDPOINTS.INTEGRATION(id)
      )
      return response.integration
    },
    enabled: !!id,
  })
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateIntegrationRequest
    }) => {
      const response = await apiClient.put<UpdateIntegrationResponse>(
        ENDPOINTS.INTEGRATION(id),
        data
      )
      return response.integration
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.lists() })
      queryClient.setQueryData(
        integrationKeys.detail(integration.id),
        integration
      )
    },
  })
}

export function useConnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      config,
    }: {
      id: number
      config: Record<string, string>
    }) => {
      const response = await apiClient.post<UpdateIntegrationResponse>(
        ENDPOINTS.INTEGRATION_CONNECT(id),
        { config }
      )
      return response.integration
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.lists() })
      queryClient.setQueryData(
        integrationKeys.detail(integration.id),
        integration
      )
    },
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<UpdateIntegrationResponse>(
        ENDPOINTS.INTEGRATION_DISCONNECT(id)
      )
      return response.integration
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.lists() })
      queryClient.setQueryData(
        integrationKeys.detail(integration.id),
        integration
      )
    },
  })
}

export function useTestIntegration() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<TestIntegrationResponse>(
        ENDPOINTS.INTEGRATION_TEST(id)
      )
      return response
    },
  })
}

// Helper to get integrations grouped by category
export function useIntegrationsByCategory() {
  const { data: integrations, ...rest } = useIntegrations()

  const grouped = integrations?.reduce(
    (acc, integration) => {
      const category = integration.category || 'other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(integration)
      return acc
    },
    {} as Record<string, Integration[]>
  )

  return { data: grouped, integrations, ...rest }
}
