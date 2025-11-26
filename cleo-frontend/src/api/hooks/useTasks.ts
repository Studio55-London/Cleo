import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateRecurrenceInput,
  GetTasksResponse,
  GetTaskResponse,
  CreateTaskResponse,
  GetTaskStatsResponse,
  GetSpaceTasksResponse,
  TaskStatus,
  TaskPriority,
  Task,
} from '@/types'

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: { spaceId?: number; status?: TaskStatus; priority?: TaskPriority }) =>
    [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
  withSubtasks: (id: number) => [...taskKeys.details(), id, 'with-subtasks'] as const,
  subtasks: (parentId: number) => [...taskKeys.all, 'subtasks', parentId] as const,
  stats: (spaceId?: number) => [...taskKeys.all, 'stats', { spaceId }] as const,
  overdue: (spaceId?: number) => [...taskKeys.all, 'overdue', { spaceId }] as const,
  recurring: (spaceId?: number) => [...taskKeys.all, 'recurring', { spaceId }] as const,
  space: (spaceId: number) => [...taskKeys.all, 'space', spaceId] as const,
}

interface TaskListFilters {
  spaceId?: number
  status?: TaskStatus
  priority?: TaskPriority
  limit?: number
}

export function useTasks(filters?: TaskListFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.spaceId) params.append('space_id', String(filters.spaceId))
      if (filters?.status) params.append('status', filters.status)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.limit) params.append('limit', String(filters.limit))

      const url = params.toString()
        ? `${ENDPOINTS.TASKS}?${params.toString()}`
        : ENDPOINTS.TASKS
      const response = await apiClient.get<GetTasksResponse>(url)
      return response.tasks
    },
  })
}

export function useTask(id: number | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<GetTaskResponse>(ENDPOINTS.TASK(id!))
      return response.task
    },
    enabled: !!id,
  })
}

export function useSpaceTasks(spaceId: number | undefined, filters?: { status?: TaskStatus; priority?: TaskPriority }) {
  return useQuery({
    queryKey: taskKeys.space(spaceId!),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.priority) params.append('priority', filters.priority)

      const url = params.toString()
        ? `${ENDPOINTS.SPACE_TASKS(spaceId!)}?${params.toString()}`
        : ENDPOINTS.SPACE_TASKS(spaceId!)
      const response = await apiClient.get<GetSpaceTasksResponse>(url)
      return response
    },
    enabled: !!spaceId,
  })
}

export function useTaskStats(spaceId?: number) {
  return useQuery({
    queryKey: taskKeys.stats(spaceId),
    queryFn: async () => {
      const url = spaceId
        ? `${ENDPOINTS.TASKS_STATS}?space_id=${spaceId}`
        : ENDPOINTS.TASKS_STATS
      const response = await apiClient.get<GetTaskStatsResponse>(url)
      return response.stats
    },
  })
}

export function useOverdueTasks(spaceId?: number) {
  return useQuery({
    queryKey: taskKeys.overdue(spaceId),
    queryFn: async () => {
      const url = spaceId
        ? `${ENDPOINTS.TASKS_OVERDUE}?space_id=${spaceId}`
        : ENDPOINTS.TASKS_OVERDUE
      const response = await apiClient.get<GetTasksResponse>(url)
      return response.tasks
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await apiClient.post<CreateTaskResponse>(
        ENDPOINTS.TASKS,
        input
      )
      return response.task
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() })
      queryClient.invalidateQueries({ queryKey: taskKeys.space(task.space_id) })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateTaskInput
    }) => {
      const response = await apiClient.put<GetTaskResponse>(
        ENDPOINTS.TASK(id),
        data
      )
      return response.task
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() })
      queryClient.invalidateQueries({ queryKey: taskKeys.space(task.space_id) })
      queryClient.setQueryData(taskKeys.detail(task.id), task)
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.TASK(id))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() })
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<GetTaskResponse>(
        ENDPOINTS.TASK_COMPLETE(id),
        {}
      )
      return response.task
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() })
      queryClient.invalidateQueries({ queryKey: taskKeys.space(task.space_id) })
      queryClient.setQueryData(taskKeys.detail(task.id), task)
    },
  })
}

// Phase 2: Subtask hooks
export function useSubtasks(parentTaskId: number | undefined) {
  return useQuery({
    queryKey: taskKeys.subtasks(parentTaskId!),
    queryFn: async () => {
      const response = await apiClient.get<GetTasksResponse>(
        ENDPOINTS.TASK_SUBTASKS(parentTaskId!)
      )
      return response.tasks
    },
    enabled: !!parentTaskId,
  })
}

export function useTaskWithSubtasks(taskId: number | undefined) {
  return useQuery({
    queryKey: taskKeys.withSubtasks(taskId!),
    queryFn: async () => {
      const response = await apiClient.get<GetTaskResponse>(
        ENDPOINTS.TASK_WITH_SUBTASKS(taskId!)
      )
      return response.task
    },
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      data,
    }: {
      parentTaskId: number
      data: CreateSubtaskInput
    }) => {
      const response = await apiClient.post<CreateTaskResponse>(
        ENDPOINTS.TASK_SUBTASKS(parentTaskId),
        data
      )
      return response.task
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(task.parent_task_id!) })
      queryClient.invalidateQueries({ queryKey: taskKeys.withSubtasks(task.parent_task_id!) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.parent_task_id!) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export function useReorderSubtasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      subtaskIds,
    }: {
      parentTaskId: number
      subtaskIds: number[]
    }) => {
      await apiClient.put(ENDPOINTS.TASK_SUBTASKS_REORDER(parentTaskId), {
        subtask_ids: subtaskIds,
      })
      return { parentTaskId, subtaskIds }
    },
    onSuccess: ({ parentTaskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(parentTaskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.withSubtasks(parentTaskId) })
    },
  })
}

// Phase 2: Recurrence hooks
export function useRecurringTasks(spaceId?: number) {
  return useQuery({
    queryKey: taskKeys.recurring(spaceId),
    queryFn: async () => {
      const url = spaceId
        ? `${ENDPOINTS.TASKS_RECURRING}?space_id=${spaceId}`
        : ENDPOINTS.TASKS_RECURRING
      const response = await apiClient.get<GetTasksResponse>(url)
      return response.tasks
    },
  })
}

export function useUpdateRecurrence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: number
      data: UpdateRecurrenceInput
    }) => {
      const response = await apiClient.put<GetTaskResponse>(
        ENDPOINTS.TASK_RECURRENCE(taskId),
        data
      )
      return response.task
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.recurring() })
      queryClient.invalidateQueries({ queryKey: taskKeys.space(task.space_id) })
      queryClient.setQueryData(taskKeys.detail(task.id), task)
    },
  })
}

export function useCompleteRecurringTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiClient.post<{ task: Task; next_task: Task | null }>(
        ENDPOINTS.TASK_COMPLETE_RECURRING(taskId),
        {}
      )
      return response
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() })
      queryClient.invalidateQueries({ queryKey: taskKeys.recurring() })
      queryClient.invalidateQueries({ queryKey: taskKeys.space(response.task.space_id) })
      queryClient.setQueryData(taskKeys.detail(response.task.id), response.task)
    },
  })
}
