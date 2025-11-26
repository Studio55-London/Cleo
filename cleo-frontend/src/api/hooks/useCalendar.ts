import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CalendarEventType,
  GetCalendarEventsResponse,
  GetCalendarEventResponse,
  CreateCalendarEventResponse,
  GetCalendarStatsResponse,
} from '@/types'

export const calendarKeys = {
  all: ['calendar'] as const,
  events: () => [...calendarKeys.all, 'events'] as const,
  eventList: (filters: { spaceId?: number; eventType?: CalendarEventType }) =>
    [...calendarKeys.events(), filters] as const,
  eventRange: (start: string, end: string, spaceId?: number) =>
    [...calendarKeys.events(), 'range', { start, end, spaceId }] as const,
  details: () => [...calendarKeys.all, 'detail'] as const,
  detail: (id: number) => [...calendarKeys.details(), id] as const,
  stats: (spaceId?: number) => [...calendarKeys.all, 'stats', { spaceId }] as const,
  upcoming: (hours: number, spaceId?: number) =>
    [...calendarKeys.all, 'upcoming', { hours, spaceId }] as const,
}

interface CalendarEventFilters {
  spaceId?: number
  taskId?: number
  eventType?: CalendarEventType
  startDate?: string
  endDate?: string
  limit?: number
}

export function useCalendarEvents(filters?: CalendarEventFilters) {
  return useQuery({
    queryKey: calendarKeys.eventList(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.spaceId) params.append('space_id', String(filters.spaceId))
      if (filters?.taskId) params.append('task_id', String(filters.taskId))
      if (filters?.eventType) params.append('event_type', filters.eventType)
      if (filters?.startDate) params.append('start_date', filters.startDate)
      if (filters?.endDate) params.append('end_date', filters.endDate)
      if (filters?.limit) params.append('limit', String(filters.limit))

      const url = params.toString()
        ? `${ENDPOINTS.CALENDAR_EVENTS}?${params.toString()}`
        : ENDPOINTS.CALENDAR_EVENTS
      const response = await apiClient.get<GetCalendarEventsResponse>(url)
      return response.events
    },
  })
}

export function useCalendarEventsRange(
  startDate: string,
  endDate: string,
  spaceId?: number
) {
  return useQuery({
    queryKey: calendarKeys.eventRange(startDate, endDate, spaceId),
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('start_date', startDate)
      params.append('end_date', endDate)
      if (spaceId) params.append('space_id', String(spaceId))

      const url = `${ENDPOINTS.CALENDAR_EVENTS_RANGE}?${params.toString()}`
      const response = await apiClient.get<GetCalendarEventsResponse>(url)
      return response.events
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useCalendarEvent(id: number | undefined) {
  return useQuery({
    queryKey: calendarKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<GetCalendarEventResponse>(
        ENDPOINTS.CALENDAR_EVENT(id!)
      )
      return response.event
    },
    enabled: !!id,
  })
}

export function useCalendarStats(spaceId?: number) {
  return useQuery({
    queryKey: calendarKeys.stats(spaceId),
    queryFn: async () => {
      const url = spaceId
        ? `${ENDPOINTS.CALENDAR_STATS}?space_id=${spaceId}`
        : ENDPOINTS.CALENDAR_STATS
      const response = await apiClient.get<GetCalendarStatsResponse>(url)
      return response.stats
    },
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCalendarEventInput) => {
      const response = await apiClient.post<CreateCalendarEventResponse>(
        ENDPOINTS.CALENDAR_EVENTS,
        input
      )
      return response.event
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
      queryClient.invalidateQueries({ queryKey: calendarKeys.stats() })
      if (event.space_id) {
        queryClient.invalidateQueries({
          queryKey: calendarKeys.stats(event.space_id),
        })
      }
    },
  })
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateCalendarEventInput
    }) => {
      const response = await apiClient.put<GetCalendarEventResponse>(
        ENDPOINTS.CALENDAR_EVENT(id),
        data
      )
      return response.event
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
      queryClient.invalidateQueries({ queryKey: calendarKeys.stats() })
      queryClient.setQueryData(calendarKeys.detail(event.id), event)
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.CALENDAR_EVENT(id))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
      queryClient.invalidateQueries({ queryKey: calendarKeys.stats() })
    },
  })
}

export function useCreateEventFromTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      durationMinutes = 60,
    }: {
      taskId: number
      durationMinutes?: number
    }) => {
      const response = await apiClient.post<CreateCalendarEventResponse>(
        ENDPOINTS.CALENDAR_EVENT_FROM_TASK(taskId),
        { duration_minutes: durationMinutes }
      )
      return response.event
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
      queryClient.invalidateQueries({ queryKey: calendarKeys.stats() })
      if (event.space_id) {
        queryClient.invalidateQueries({
          queryKey: calendarKeys.stats(event.space_id),
        })
      }
    },
  })
}
