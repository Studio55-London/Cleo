import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  NotificationType,
  CreateNotificationInput,
  GetNotificationsResponse,
  GetNotificationResponse,
  CreateNotificationResponse,
  GetNotificationStatsResponse,
  GetUnreadCountResponse,
  MarkAllReadResponse,
  DismissAllResponse,
} from '@/types'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: {
    spaceId?: number
    type?: NotificationType
    unreadOnly?: boolean
  }) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: number) => [...notificationKeys.details(), id] as const,
  unreadCount: (userId?: number) =>
    [...notificationKeys.all, 'unread-count', { userId }] as const,
  stats: (userId?: number) =>
    [...notificationKeys.all, 'stats', { userId }] as const,
}

interface NotificationFilters {
  userId?: number
  spaceId?: number
  type?: NotificationType
  unreadOnly?: boolean
  includeDismissed?: boolean
  limit?: number
}

export function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: notificationKeys.list(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.userId) params.append('user_id', String(filters.userId))
      if (filters?.spaceId) params.append('space_id', String(filters.spaceId))
      if (filters?.type) params.append('type', filters.type)
      if (filters?.unreadOnly) params.append('unread_only', 'true')
      if (filters?.includeDismissed) params.append('include_dismissed', 'true')
      if (filters?.limit) params.append('limit', String(filters.limit))

      const url = params.toString()
        ? `${ENDPOINTS.NOTIFICATIONS}?${params.toString()}`
        : ENDPOINTS.NOTIFICATIONS
      const response = await apiClient.get<GetNotificationsResponse>(url)
      return response.notifications
    },
  })
}

export function useNotification(id: number | undefined) {
  return useQuery({
    queryKey: notificationKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get<GetNotificationResponse>(
        ENDPOINTS.NOTIFICATION(id!)
      )
      return response.notification
    },
    enabled: !!id,
  })
}

export function useUnreadCount(userId?: number) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: async () => {
      const url = userId
        ? `${ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT}?user_id=${userId}`
        : ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT
      const response = await apiClient.get<GetUnreadCountResponse>(url)
      return response.unread_count
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useNotificationStats(userId?: number) {
  return useQuery({
    queryKey: notificationKeys.stats(userId),
    queryFn: async () => {
      const url = userId
        ? `${ENDPOINTS.NOTIFICATIONS_STATS}?user_id=${userId}`
        : ENDPOINTS.NOTIFICATIONS_STATS
      const response = await apiClient.get<GetNotificationStatsResponse>(url)
      return response.stats
    },
  })
}

export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      const response = await apiClient.post<CreateNotificationResponse>(
        ENDPOINTS.NOTIFICATIONS,
        input
      )
      return response.notification
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
    },
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<GetNotificationResponse>(
        ENDPOINTS.NOTIFICATION_READ(id),
        {}
      )
      return response.notification
    },
    onSuccess: (notification) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
      queryClient.setQueryData(notificationKeys.detail(notification.id), notification)
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId?: number | void) => {
      const response = await apiClient.post<MarkAllReadResponse>(
        ENDPOINTS.NOTIFICATIONS_READ_ALL,
        userId ? { user_id: userId } : {}
      )
      return response.marked_count
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
    },
  })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<GetNotificationResponse>(
        ENDPOINTS.NOTIFICATION_DISMISS(id),
        {}
      )
      return response.notification
    },
    onSuccess: (notification) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
      queryClient.setQueryData(notificationKeys.detail(notification.id), notification)
    },
  })
}

export function useDismissAllNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId?: number | void) => {
      const response = await apiClient.post<DismissAllResponse>(
        ENDPOINTS.NOTIFICATIONS_DISMISS_ALL,
        userId ? { user_id: userId } : {}
      )
      return response.dismissed_count
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(ENDPOINTS.NOTIFICATION(id))
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() })
    },
  })
}
