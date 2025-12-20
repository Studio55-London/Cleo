import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  GetDocumentsResponse,
  SearchKnowledgeRequest,
  SearchKnowledgeResponse,
  GetKnowledgeGraphResponse,
  UploadDocumentResponse,
} from '@/types'

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  documents: () => [...knowledgeKeys.all, 'documents'] as const,
  document: (id: number) => [...knowledgeKeys.documents(), id] as const,
  search: (query: string) => [...knowledgeKeys.all, 'search', query] as const,
  graph: () => [...knowledgeKeys.all, 'graph'] as const,
  entities: () => [...knowledgeKeys.all, 'entities'] as const,
  relations: () => [...knowledgeKeys.all, 'relations'] as const,
}

export function useDocuments() {
  return useQuery({
    queryKey: knowledgeKeys.documents(),
    queryFn: async () => {
      const response = await apiClient.get<GetDocumentsResponse>(
        ENDPOINTS.KNOWLEDGE_DOCUMENTS
      )
      return response.documents
    },
  })
}

interface UploadDocumentOptions {
  file: File
  knowledgeBaseIds?: number[]
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, knowledgeBaseIds }: UploadDocumentOptions) => {
      const formData = new FormData()
      formData.append('file', file)
      if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
        formData.append('knowledge_base_ids', JSON.stringify(knowledgeBaseIds))
      }
      const response = await apiClient.post<UploadDocumentResponse>(
        ENDPOINTS.KNOWLEDGE_UPLOAD,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data.document
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.documents() })
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.KNOWLEDGE_DOCUMENT(id))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.documents() })
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.graph() })
    },
  })
}

export function useSearchKnowledge(query: string, enabled = true) {
  return useQuery({
    queryKey: knowledgeKeys.search(query),
    queryFn: async () => {
      const request: SearchKnowledgeRequest = { query }
      const response = await apiClient.post<SearchKnowledgeResponse>(
        ENDPOINTS.KNOWLEDGE_SEARCH,
        request
      )
      return response.results
    },
    enabled: enabled && query.length > 0,
  })
}

export function useSearchKnowledgeMutation() {
  return useMutation({
    mutationFn: async (request: SearchKnowledgeRequest) => {
      const response = await apiClient.post<SearchKnowledgeResponse>(
        ENDPOINTS.KNOWLEDGE_SEARCH,
        request
      )
      return response.results
    },
  })
}

export function useKnowledgeGraph() {
  return useQuery({
    queryKey: knowledgeKeys.graph(),
    queryFn: async () => {
      const response = await apiClient.get<GetKnowledgeGraphResponse>(
        ENDPOINTS.KNOWLEDGE_GRAPH
      )
      return response.graph
    },
  })
}
