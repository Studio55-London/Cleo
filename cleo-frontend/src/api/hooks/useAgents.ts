import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type { Agent, AgentTier, CreateAgentInput, UpdateAgentInput } from '@/types'

// Raw response from Flask API (uses 'tier' instead of 'type', with PascalCase values)
interface FlaskAgentResponse {
  id: number
  name: string
  tier: string // Flask returns PascalCase like "Expert", "Master", etc.
  description?: string | null
  status: string
}

interface FlaskGetAgentsResponse {
  success: boolean
  agents: FlaskAgentResponse[]
}

// Transform Flask response to React Agent type
function transformAgent(raw: FlaskAgentResponse): Agent {
  // Convert tier to lowercase to match AgentTier type
  const tierLower = raw.tier.toLowerCase() as AgentTier

  return {
    id: raw.id,
    name: raw.name,
    type: tierLower, // Map 'tier' to 'type' and normalize case
    description: raw.description ?? null,
    status: raw.status === 'online' ? 'active' : 'inactive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: number) => [...agentKeys.details(), id] as const,
}

export function useAgents() {
  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<FlaskGetAgentsResponse>(ENDPOINTS.AGENTS)
      return response.agents.map(transformAgent)
    },
  })
}

export function useAgent(id: number) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<{ agent: Agent }>(
        ENDPOINTS.AGENT(id)
      )
      return response.agent
    },
    enabled: !!id,
  })
}

// Helper to get agents grouped by tier
export function useAgentsByTier() {
  const { data: agents, ...rest } = useAgents()

  const grouped = agents?.reduce(
    (acc, agent) => {
      const tier = agent.type
      if (!acc[tier]) {
        acc[tier] = []
      }
      acc[tier].push(agent)
      return acc
    },
    {} as Record<string, Agent[]>
  )

  return { data: grouped, agents, ...rest }
}

export function useCreateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAgentInput) => {
      const response = await apiClient.post<{ agent: Agent }>(
        ENDPOINTS.AGENTS,
        input
      )
      return response.agent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
    },
  })
}

export function useUpdateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateAgentInput & { id: number }) => {
      const response = await apiClient.put<{ agent: Agent }>(
        ENDPOINTS.AGENT(id),
        input
      )
      return response.agent
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.AGENT(id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all })
    },
  })
}
