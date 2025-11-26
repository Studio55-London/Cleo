import type {
  Agent,
  Space,
  Message,
  Document,
  Entity,
  Relation,
  Integration,
  SearchResult,
  KnowledgeGraphData,
  Task,
  TaskStats,
  CalendarEvent,
  CalendarStats,
  Notification,
  NotificationStats,
  TaskTemplate,
} from './models'

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

// Agent API
export interface GetAgentsResponse {
  agents: Agent[]
}

export interface GetAgentResponse {
  agent: Agent
}

// Space API
export interface GetSpacesResponse {
  spaces: Space[]
}

export interface GetSpaceResponse {
  space: Space
}

export interface CreateSpaceResponse {
  space: Space
}

export interface AddAgentToSpaceRequest {
  agent_id: number
}

// Message API
export interface GetMessagesResponse {
  messages: Message[]
}

export interface SendMessageRequest {
  message: string
  mentions?: string[]
}

export interface SendMessageResponse {
  message: Message
  response?: Message // Flask returns 'response', not 'agent_response'
}

// Knowledge API
export interface GetDocumentsResponse {
  documents: Document[]
}

export interface UploadDocumentResponse {
  document: Document
}

export interface SearchKnowledgeRequest {
  query: string
  limit?: number
  filters?: {
    document_ids?: number[]
    entity_types?: string[]
  }
}

export interface SearchKnowledgeResponse {
  results: SearchResult[]
  total: number
}

export interface GetKnowledgeGraphResponse {
  graph: KnowledgeGraphData
}

export interface GetEntitiesResponse {
  entities: Entity[]
}

export interface GetRelationsResponse {
  relations: Relation[]
}

// Integration API
export interface GetIntegrationsResponse {
  integrations: Integration[]
}

export interface UpdateIntegrationRequest {
  enabled?: boolean
  config?: Record<string, string>
}

export interface UpdateIntegrationResponse {
  integration: Integration
}

export interface TestIntegrationResponse {
  success: boolean
  message: string
}

// Auth API
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message?: string
  redirect?: string
}

export interface LogoutResponse {
  success: boolean
}

// Task API
export interface GetTasksResponse {
  success: boolean
  tasks: Task[]
  count: number
}

export interface GetTaskResponse {
  success: boolean
  task: Task
}

export interface CreateTaskResponse {
  success: boolean
  task: Task
}

export interface GetTaskStatsResponse {
  success: boolean
  stats: TaskStats
}

export interface GetSpaceTasksResponse {
  success: boolean
  tasks: Task[]
  stats: TaskStats
  space: Space
}

// Error types
export interface ApiError {
  status: number
  message: string
  details?: Record<string, unknown>
}

// ===================================
// Phase 4: Calendar Event API
// ===================================

export interface GetCalendarEventsResponse {
  success: boolean
  events: CalendarEvent[]
  count: number
}

export interface GetCalendarEventResponse {
  success: boolean
  event: CalendarEvent
}

export interface CreateCalendarEventResponse {
  success: boolean
  event: CalendarEvent
}

export interface GetCalendarStatsResponse {
  success: boolean
  stats: CalendarStats
}

// ===================================
// Phase 5: Notification API
// ===================================

export interface GetNotificationsResponse {
  success: boolean
  notifications: Notification[]
  count: number
}

export interface GetNotificationResponse {
  success: boolean
  notification: Notification
}

export interface CreateNotificationResponse {
  success: boolean
  notification: Notification
}

export interface GetNotificationStatsResponse {
  success: boolean
  stats: NotificationStats
}

export interface GetUnreadCountResponse {
  success: boolean
  unread_count: number
}

export interface MarkAllReadResponse {
  success: boolean
  marked_count: number
}

export interface DismissAllResponse {
  success: boolean
  dismissed_count: number
}

// ===================================
// Phase 6: Task Template API
// ===================================

export interface GetTaskTemplatesResponse {
  success: boolean
  templates: TaskTemplate[]
  count: number
}

export interface GetTaskTemplateResponse {
  success: boolean
  template: TaskTemplate
}

export interface CreateTaskTemplateResponse {
  success: boolean
  template: TaskTemplate
}

export interface ApplyTemplateResponse {
  success: boolean
  task: Task
}

export interface GetTemplateCategoriesResponse {
  success: boolean
  categories: string[]
}

export interface SeedTemplatesResponse {
  success: boolean
  created_count: number
  templates: TaskTemplate[]
}
