// API endpoint constants

export const ENDPOINTS = {
  // Agents
  AGENTS: '/agents',
  AGENT: (id: number) => `/agents/${id}`,

  // Spaces
  SPACES: '/spaces',
  SPACE: (id: string) => `/spaces/${id}`,
  SPACE_AGENTS: (id: string) => `/spaces/${id}/agents`,
  SPACE_AGENT: (spaceId: string, agentId: number) =>
    `/spaces/${spaceId}/agents/${agentId}`,
  SPACE_MESSAGES: (id: string) => `/spaces/${id}/messages`,
  SPACE_MASTER_AGENT: (id: string) => `/spaces/${id}/master-agent`,

  // Knowledge
  KNOWLEDGE_DOCUMENTS: '/knowledge/documents',
  KNOWLEDGE_DOCUMENT: (id: number) => `/knowledge/documents/${id}`,
  KNOWLEDGE_UPLOAD: '/knowledge/upload',
  KNOWLEDGE_SEARCH: '/knowledge/search',
  KNOWLEDGE_GRAPH: '/knowledge/graph',
  KNOWLEDGE_ENTITIES: '/knowledge/entities',
  KNOWLEDGE_RELATIONS: '/knowledge/relations',

  // Integrations
  INTEGRATIONS: '/integrations',
  INTEGRATION: (id: number) => `/integrations/${id}`,
  INTEGRATION_CONNECT: (id: number) => `/integrations/${id}/connect`,
  INTEGRATION_DISCONNECT: (id: number) => `/integrations/${id}/disconnect`,
  INTEGRATION_TEST: (id: number) => `/integrations/${id}/test`,

  // Skills
  SKILLS: '/skills',
  SKILL: (id: number) => `/skills/${id}`,
  SKILLS_GLOBAL: '/skills/global',
  SKILLS_CATEGORIES: '/skills/categories',
  SKILLS_TEMPLATE: (category: string) => `/skills/templates/${category}`,
  AGENT_SKILLS: (agentId: number) => `/agents/${agentId}/skills`,
  AGENT_SKILL: (agentId: number, skillId: number) => `/agents/${agentId}/skills/${skillId}`,

  // Auth
  LOGIN: '/login',
  LOGOUT: '/logout',
  CURRENT_USER: '/user',

  // Tasks (AscendoreQ integration)
  TASKS: '/tasks',
  TASK: (id: number) => `/tasks/${id}`,
  TASK_COMPLETE: (id: number) => `/tasks/${id}/complete`,
  TASKS_STATS: '/tasks/stats',
  TASKS_OVERDUE: '/tasks/overdue',
  SPACE_TASKS: (spaceId: number | string) => `/spaces/${spaceId}/tasks`,

  // Phase 2: Subtasks
  TASK_SUBTASKS: (taskId: number) => `/tasks/${taskId}/subtasks`,
  TASK_SUBTASKS_REORDER: (taskId: number) => `/tasks/${taskId}/subtasks/reorder`,
  TASK_WITH_SUBTASKS: (taskId: number) => `/tasks/${taskId}/with-subtasks`,

  // Phase 2: Recurrence
  TASK_RECURRENCE: (taskId: number) => `/tasks/${taskId}/recurrence`,
  TASK_COMPLETE_RECURRING: (taskId: number) => `/tasks/${taskId}/complete-recurring`,
  TASKS_RECURRING: '/tasks/recurring',

  // Phase 4: Calendar Events
  CALENDAR_EVENTS: '/calendar/events',
  CALENDAR_EVENT: (id: number) => `/calendar/events/${id}`,
  CALENDAR_EVENTS_RANGE: '/calendar/events/range',
  CALENDAR_EVENT_FROM_TASK: (taskId: number) => `/calendar/events/from-task/${taskId}`,
  CALENDAR_STATS: '/calendar/stats',

  // Phase 5: Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION: (id: number) => `/notifications/${id}`,
  NOTIFICATION_READ: (id: number) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
  NOTIFICATION_DISMISS: (id: number) => `/notifications/${id}/dismiss`,
  NOTIFICATIONS_DISMISS_ALL: '/notifications/dismiss-all',
  NOTIFICATIONS_UNREAD_COUNT: '/notifications/unread-count',
  NOTIFICATIONS_STATS: '/notifications/stats',

  // Phase 6: Task Templates
  TEMPLATES: '/templates',
  TEMPLATE: (id: number) => `/templates/${id}`,
  TEMPLATE_APPLY: (id: number) => `/templates/${id}/apply`,
  TEMPLATE_DUPLICATE: (id: number) => `/templates/${id}/duplicate`,
  TEMPLATES_CATEGORIES: '/templates/categories',
  TEMPLATES_POPULAR: '/templates/popular',
  TEMPLATES_RECENT: '/templates/recent',
  TEMPLATES_SEARCH: '/templates/search',
  TEMPLATES_SEED: '/templates/seed',
} as const
