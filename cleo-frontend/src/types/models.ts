// Agent tier types
export type AgentTier = 'master' | 'personal' | 'team' | 'worker' | 'expert'
export type AgentStatus = 'active' | 'inactive'

// Agent interfaces
export interface Agent {
  id: number
  name: string
  type: AgentTier
  description: string | null
  status: AgentStatus
  created_at: string
  updated_at: string
}

export interface AgentSummary {
  id: number
  name: string
  tier: AgentTier
  description?: string
}

export interface CreateAgentInput {
  name: string
  type: AgentTier
  description?: string
}

export interface UpdateAgentInput {
  name?: string
  type?: AgentTier
  description?: string
  status?: AgentStatus
}

// Knowledge Base interfaces
export interface KnowledgeBase {
  id: number
  name: string
  description: string | null
  space_id: number
  space_name: string | null
  is_default: boolean
  document_count: number
  created_at: string
  updated_at: string
}

export interface KnowledgeBaseSummary {
  id: number
  name: string
  document_count: number
  space_id?: number
}

export interface CreateKnowledgeBaseInput {
  name: string
  description?: string
  is_default?: boolean
}

export interface UpdateKnowledgeBaseInput {
  name?: string
  description?: string
}

// Space interfaces
export interface Space {
  id: string
  name: string
  description: string
  agents: AgentSummary[]
  master_agent_id: number | null
  master_agent: AgentSummary | null
  is_global: boolean
  user_id: number | null
  knowledge_bases: KnowledgeBaseSummary[]
  created_at: string
  updated_at: string
  unread: number
}

export interface CreateSpaceInput {
  name: string
  description?: string
  agent_ids?: number[]
  master_agent_id?: number
}

export interface UpdateSpaceInput {
  name?: string
  description?: string
  master_agent_id?: number
}

// Message interfaces
export type MessageRole = 'user' | 'agent'

export interface Citation {
  document_id: number
  document_name: string
  chunk_id: number
  content_preview: string
  relevance_score: number
}

export interface Message {
  id: number
  role: MessageRole
  author: string
  content: string
  timestamp: string
  agent_name?: string
  agent_tier?: AgentTier
  mentions?: string[]
  citations?: Citation[]
}

export interface SendMessageInput {
  content: string
  mentions?: string[]
}

// User interfaces
export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
  email_verified: boolean
  created_at: string
  last_login: string | null
}

// Auth types
export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  full_name?: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
}

export interface OAuthProvider {
  name: string
  enabled: boolean
  authorize_url?: string
}

// Job interfaces
export type JobFrequency = 'manual' | 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
export type JobStatus = 'active' | 'paused' | 'completed'

export interface Job {
  id: number
  agent_id: number
  agent_name: string | null
  name: string
  description: string | null
  frequency: JobFrequency
  cron_expression: string | null
  sop: string | null
  status: JobStatus
  last_run: string | null
  next_run: string | null
  created_at: string
  updated_at: string
}

// Activity interfaces
export type ActivityStatus = 'success' | 'failed' | 'warning'

export interface Activity {
  id: number
  agent_id: number
  agent_name: string | null
  job_id: number | null
  job_name: string | null
  title: string
  summary: string | null
  output_data: string | null
  status: ActivityStatus
  created_at: string
}

// Knowledge Base interfaces
export type DocumentStatus = 'processing' | 'ready' | 'error'

export interface DocumentKnowledgeBase {
  id: number
  name: string
  space_id: number
}

export interface Document {
  id: number
  name: string
  file_type: string | null
  size: string
  status: DocumentStatus
  chunks: number
  entities: number
  uploaded_at: string
  processed_at: string | null
  knowledge_bases: DocumentKnowledgeBase[]
}

export interface DocumentChunk {
  id: number
  document_id: number
  chunk_index: number
  content: string
  token_count: number | null
  metadata: Record<string, unknown>
}

export type EntityType = 'person' | 'organization' | 'location' | 'concept' | 'event' | 'product' | 'other'

export interface Entity {
  id: number
  name: string
  type: EntityType
  description: string | null
  properties: Record<string, unknown>
  mention_count: number
  created_at: string
}

export interface Relation {
  id: number
  source: number
  target: number
  type: string
  properties: Record<string, unknown>
  confidence: number
}

export interface KnowledgeGraphData {
  entities: Entity[]
  relations: Relation[]
}

export interface SearchResult {
  document_id: number
  document_name: string
  chunk_id: number
  content: string
  relevance_score: number
  metadata: Record<string, unknown>
}

// Integration interfaces
export type IntegrationStatus = 'connected' | 'disconnected' | 'error'
export type IntegrationCategory = 'productivity' | 'communication' | 'calendar'

export interface Integration {
  id: number
  name: string
  display_name: string | null
  description: string | null
  category: IntegrationCategory | null
  icon: string | null
  enabled: boolean
  config: Record<string, string>
  status: IntegrationStatus
  last_sync: string | null
  error_message: string | null
  created_at: string | null
  updated_at: string | null
}

export interface IntegrationConfigInput {
  enabled?: boolean
  config?: Record<string, string>
}

// Skill interfaces
export type SkillCategory =
  | 'productivity'
  | 'communication'
  | 'analysis'
  | 'coordination'
  | 'planning'
  | 'research'
  | 'writing'
  | 'finance'
  | 'legal'
  | 'marketing'
  | 'technical'
  | 'other'

export interface Skill {
  id: number
  name: string
  display_name: string
  description: string
  content: string
  agent_id: number | null
  agent_name?: string
  is_global: boolean
  is_active: boolean
  category: SkillCategory | null
  triggers: string[]
  version: string
  author: string | null
  created_at: string
  updated_at: string
}

export interface SkillSummary {
  id: number
  name: string
  display_name: string
  description: string
  is_global: boolean
  is_active: boolean
  category: SkillCategory | null
}

export interface CreateSkillInput {
  display_name: string
  description: string
  content: string
  agent_id?: number
  is_global?: boolean
  category?: SkillCategory
  triggers?: string[]
  author?: string
}

export interface UpdateSkillInput {
  display_name?: string
  description?: string
  content?: string
  agent_id?: number
  is_global?: boolean
  is_active?: boolean
  category?: SkillCategory
  triggers?: string[]
}

// Task interfaces (AscendoreQ integration)
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'

// Recurrence type for tasks
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | null

export interface Task {
  id: number
  space_id: number
  space_name: string | null
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  // Phase 2: Recurrence fields
  recurrence_type: RecurrenceType
  recurrence_interval: number
  recurrence_days: number[]
  recurrence_end_date: string | null
  next_occurrence: string | null
  is_recurring_instance: boolean
  original_task_id: number | null
  // Phase 2: Subtask fields
  parent_task_id: number | null
  position: number
  subtask_count: number
  completed_subtask_count: number
  // Optional subtasks array (when include_subtasks=true)
  subtasks?: Task[]
}

export interface TaskStats {
  todo: number
  in_progress: number
  completed: number
  total: number
}

export interface CreateTaskInput {
  space_id: number
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
  // Phase 2: Subtask and recurrence
  parent_task_id?: number
  recurrence_type?: RecurrenceType
  recurrence_interval?: number
  recurrence_days?: number[]
  recurrence_end_date?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string | null
}

// Phase 2: Subtask input
export interface CreateSubtaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
}

// Phase 2: Recurrence update input
export interface UpdateRecurrenceInput {
  recurrence_type?: RecurrenceType
  recurrence_interval?: number
  recurrence_days?: number[]
  recurrence_end_date?: string | null
}

// ===================================
// Phase 4: Calendar Events
// ===================================

export type CalendarEventType = 'event' | 'meeting' | 'deadline' | 'reminder' | 'block'
export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled'
export type SyncStatus = 'local' | 'synced' | 'error'

export interface CalendarAttendee {
  email: string
  name?: string
  status?: 'accepted' | 'declined' | 'tentative' | 'pending'
}

export interface CalendarEvent {
  id: number
  task_id: number | null
  space_id: number | null
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  all_day: boolean
  timezone: string
  is_recurring: boolean
  recurrence_rule: string | null
  recurrence_end: string | null
  event_type: CalendarEventType
  status: CalendarEventStatus
  color: string | null
  external_id: string | null
  external_source: string | null
  sync_status: SyncStatus
  reminder_minutes: number[]
  attendees: CalendarAttendee[]
  task: Task | null
  space_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateCalendarEventInput {
  title: string
  start_time: string
  end_time: string
  space_id?: number
  task_id?: number
  description?: string
  location?: string
  all_day?: boolean
  timezone?: string
  event_type?: CalendarEventType
  color?: string
  reminder_minutes?: number[]
  attendees?: CalendarAttendee[]
  is_recurring?: boolean
  recurrence_rule?: string
  recurrence_end?: string
}

export interface UpdateCalendarEventInput {
  title?: string
  start_time?: string
  end_time?: string
  description?: string
  location?: string
  all_day?: boolean
  timezone?: string
  event_type?: CalendarEventType
  status?: CalendarEventStatus
  color?: string
  reminder_minutes?: number[]
  attendees?: CalendarAttendee[]
  is_recurring?: boolean
  recurrence_rule?: string
  recurrence_end?: string
}

export interface CalendarStats {
  total: number
  by_type: Record<CalendarEventType, number>
  upcoming_count: number
  next_event: CalendarEvent | null
}

// ===================================
// Phase 5: Notifications
// ===================================

export type NotificationType = 'task_due' | 'task_overdue' | 'reminder' | 'system' | 'mention' | 'calendar'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: number
  user_id: number | null
  task_id: number | null
  space_id: number | null
  title: string
  message: string | null
  type: NotificationType
  priority: NotificationPriority
  is_read: boolean
  read_at: string | null
  is_dismissed: boolean
  action_url: string | null
  action_data: Record<string, unknown>
  scheduled_for: string | null
  sent_at: string | null
  created_at: string
  task: Task | null
  space_name: string | null
}

export interface CreateNotificationInput {
  title: string
  type: NotificationType
  message?: string
  user_id?: number
  task_id?: number
  space_id?: number
  priority?: NotificationPriority
  action_url?: string
  action_data?: Record<string, unknown>
  scheduled_for?: string
}

export interface NotificationStats {
  total: number
  unread: number
  urgent: number
  by_type: Record<NotificationType, number>
}

// ===================================
// Phase 6: Task Templates
// ===================================

export type TemplateCategory = 'meetings' | 'planning' | 'development' | 'work' | 'personal' | 'project' | string

export interface SubtaskTemplate {
  title: string
  description?: string
  priority?: TaskPriority
}

export interface TaskTemplate {
  id: number
  name: string
  description: string | null
  title_template: string
  description_template: string | null
  default_priority: TaskPriority
  default_due_offset_days: number | null
  default_recurrence_type: RecurrenceType
  default_recurrence_interval: number
  default_recurrence_days: number[]
  subtask_templates: SubtaskTemplate[]
  category: TemplateCategory | null
  tags: string[]
  icon: string | null
  color: string | null
  space_id: number | null
  is_global: boolean
  is_active: boolean
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskTemplateInput {
  name: string
  title_template: string
  description?: string
  description_template?: string
  default_priority?: TaskPriority
  default_due_offset_days?: number
  default_recurrence_type?: RecurrenceType
  default_recurrence_interval?: number
  default_recurrence_days?: number[]
  subtask_templates?: SubtaskTemplate[]
  category?: TemplateCategory
  tags?: string[]
  icon?: string
  color?: string
  space_id?: number
  is_global?: boolean
}

export interface UpdateTaskTemplateInput {
  name?: string
  title_template?: string
  description?: string
  description_template?: string
  default_priority?: TaskPriority
  default_due_offset_days?: number
  default_recurrence_type?: RecurrenceType
  default_recurrence_interval?: number
  default_recurrence_days?: number[]
  subtask_templates?: SubtaskTemplate[]
  category?: TemplateCategory
  tags?: string[]
  icon?: string
  color?: string
  space_id?: number
  is_global?: boolean
  is_active?: boolean
}

export interface ApplyTemplateInput {
  space_id: number
  title_vars?: Record<string, string>
  description_vars?: Record<string, string>
  due_date?: string
  create_subtasks?: boolean
}
