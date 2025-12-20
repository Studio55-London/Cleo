import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import type {
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
  Document,
} from '@/types'

// Query keys for caching
export const knowledgeBaseKeys = {
  all: ['knowledgeBases'] as const,
  lists: () => [...knowledgeBaseKeys.all, 'list'] as const,
  list: (spaceId?: string | number) => [...knowledgeBaseKeys.lists(), { spaceId }] as const,
  details: () => [...knowledgeBaseKeys.all, 'detail'] as const,
  detail: (id: number) => [...knowledgeBaseKeys.details(), id] as const,
  documents: (id: number) => [...knowledgeBaseKeys.detail(id), 'documents'] as const,
}

interface GetKnowledgeBasesResponse {
  success: boolean
  knowledge_bases: KnowledgeBase[]
  is_global_access?: boolean
}

interface GetKnowledgeBaseResponse {
  success: boolean
  knowledge_base: KnowledgeBase
  documents: Document[]
}

interface KnowledgeBaseDocumentsResponse {
  success: boolean
  documents: Document[]
}

interface MutationResponse {
  success: boolean
  knowledge_base?: KnowledgeBase
  message?: string
}

// Get all knowledge bases (optionally filtered by space)
export function useKnowledgeBases(spaceId?: string | number) {
  return useQuery({
    queryKey: knowledgeBaseKeys.list(spaceId),
    queryFn: async () => {
      const endpoint = spaceId
        ? `/spaces/${spaceId}/knowledge-bases`
        : '/knowledge-bases'
      const response = await apiClient.get<GetKnowledgeBasesResponse>(endpoint)
      return response.knowledge_bases
    },
  })
}

// Get a single knowledge base with its documents
export function useKnowledgeBase(id: number) {
  return useQuery({
    queryKey: knowledgeBaseKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<GetKnowledgeBaseResponse>(
        `/knowledge-bases/${id}`
      )
      return response
    },
    enabled: !!id && id > 0,
  })
}

// Get documents in a knowledge base
export function useKnowledgeBaseDocuments(id: number) {
  return useQuery({
    queryKey: knowledgeBaseKeys.documents(id),
    queryFn: async () => {
      const response = await apiClient.get<KnowledgeBaseDocumentsResponse>(
        `/knowledge-bases/${id}/documents`
      )
      return response.documents
    },
    enabled: !!id && id > 0,
  })
}

// Create a new knowledge base
export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      data,
    }: {
      spaceId: number | string
      data: CreateKnowledgeBaseInput
    }) => {
      const response = await apiClient.post<MutationResponse>(
        `/spaces/${spaceId}/knowledge-bases`,
        data
      )
      return response.knowledge_base!
    },
    onSuccess: (kb) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() })
      if (kb.space_id) {
        queryClient.invalidateQueries({
          queryKey: knowledgeBaseKeys.list(kb.space_id),
        })
      }
    },
  })
}

// Update a knowledge base
export function useUpdateKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateKnowledgeBaseInput
    }) => {
      const response = await apiClient.put<MutationResponse>(
        `/knowledge-bases/${id}`,
        data
      )
      return response.knowledge_base!
    },
    onSuccess: (kb) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() })
      queryClient.setQueryData(knowledgeBaseKeys.detail(kb.id), (old: GetKnowledgeBaseResponse | undefined) => {
        if (old) {
          return { ...old, knowledge_base: kb }
        }
        return old
      })
    },
  })
}

// Delete a knowledge base
export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/knowledge-bases/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() })
    },
  })
}

// Add documents to a knowledge base
export function useAddDocumentsToKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      knowledgeBaseId,
      documentIds,
    }: {
      knowledgeBaseId: number
      documentIds: number[]
    }) => {
      const response = await apiClient.post<MutationResponse>(
        `/knowledge-bases/${knowledgeBaseId}/documents`,
        { document_ids: documentIds }
      )
      return response
    },
    onSuccess: (_, { knowledgeBaseId }) => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.documents(knowledgeBaseId),
      })
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.detail(knowledgeBaseId),
      })
    },
  })
}

// Remove a document from a knowledge base
export function useRemoveDocumentFromKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      knowledgeBaseId,
      documentId,
    }: {
      knowledgeBaseId: number
      documentId: number
    }) => {
      await apiClient.delete(
        `/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`
      )
    },
    onSuccess: (_, { knowledgeBaseId }) => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.documents(knowledgeBaseId),
      })
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.detail(knowledgeBaseId),
      })
    },
  })
}

// Get the global space
export function useGlobalSpace() {
  return useQuery({
    queryKey: ['globalSpace'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; space: any }>(
        '/spaces/global'
      )
      return response.space
    },
  })
}
