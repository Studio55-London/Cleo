import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  Message,
  SendMessageRequest,
  GetMessagesResponse,
  SendMessageResponse,
} from '@/types'

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (spaceId: string) => [...messageKeys.lists(), spaceId] as const,
}

export function useMessages(spaceId: string | undefined) {
  return useQuery({
    queryKey: messageKeys.list(spaceId!),
    queryFn: async () => {
      const response = await apiClient.get<GetMessagesResponse>(
        ENDPOINTS.SPACE_MESSAGES(spaceId!)
      )
      return response.messages
    },
    enabled: !!spaceId,
    refetchInterval: false, // Don't auto-refetch, we'll handle this manually
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      data,
    }: {
      spaceId: string
      data: SendMessageRequest
    }) => {
      const response = await apiClient.post<SendMessageResponse>(
        ENDPOINTS.SPACE_MESSAGES(spaceId),
        data
      )
      return { spaceId, response }
    },
    onMutate: async ({ spaceId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: messageKeys.list(spaceId) })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(
        messageKeys.list(spaceId)
      )

      // Optimistically update to the new value
      const optimisticMessage: Message = {
        id: Date.now(), // Temporary ID
        role: 'user',
        author: 'You',
        content: data.message,
        timestamp: new Date().toISOString(),
        mentions: data.mentions,
      }

      queryClient.setQueryData<Message[]>(messageKeys.list(spaceId), (old) => [
        ...(old || []),
        optimisticMessage,
      ])

      return { previousMessages, spaceId }
    },
    onError: (_err, _vars, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageKeys.list(context.spaceId),
          context.previousMessages
        )
      }
    },
    onSuccess: ({ spaceId, response }) => {
      // Replace optimistic update with actual data
      queryClient.setQueryData<Message[]>(messageKeys.list(spaceId), (old) => {
        if (!old) return [response.message]

        // Remove the optimistic message and add real messages
        const withoutOptimistic = old.filter((m) => m.id !== Date.now())
        const newMessages = [response.message]

        if (response.response) {
          newMessages.push(response.response)
        }

        return [...withoutOptimistic, ...newMessages]
      })
    },
  })
}
