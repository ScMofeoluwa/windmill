import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { PaginationOpts } from './types'

export const queryKeys = {
  overview: ['overview'] as const,
  streams: ['streams'] as const,
  stream: (name: string) => ['stream', name] as const,
  streamMessages: (name: string, opts: PaginationOpts) => ['stream', name, 'messages', opts] as const,
  dlqStats: ['dlq', 'stats'] as const,
  dlqMessages: (opts: PaginationOpts) => ['dlq', 'messages', opts] as const,
}

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: api.getOverview,
  })
}

export function useStreams() {
  return useQuery({
    queryKey: queryKeys.streams,
    queryFn: api.getStreams,
  })
}

export function useStream(name: string) {
  return useQuery({
    queryKey: queryKeys.stream(name),
    queryFn: () => api.getStream(name),
    enabled: !!name,
  })
}

export function useStreamMessages(name: string, opts: PaginationOpts) {
  return useQuery({
    queryKey: queryKeys.streamMessages(name, opts),
    queryFn: () => api.getStreamMessages(name, opts),
    enabled: !!name,
  })
}

export function useDLQStats() {
  return useQuery({
    queryKey: queryKeys.dlqStats,
    queryFn: api.getDLQStats,
  })
}

export function useDLQMessages(opts: PaginationOpts) {
  return useQuery({
    queryKey: queryKeys.dlqMessages(opts),
    queryFn: () => api.getDLQMessages(opts),
  })
}

export function useRequeueMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: any }) =>
      api.requeueMessage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dlqMessages({}) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dlqStats })
    },
  })
}

export function useRequeueAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.requeueAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dlqMessages({}) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dlqStats })
    },
  })
}

export function useDeleteDLQMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteDLQMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dlqMessages({}) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dlqStats })
    },
  })
}

export function useDeleteStreamMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, id }: { name: string; id: string }) =>
      api.deleteStreamMessage(name, id),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.streamMessages(name, {}) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stream(name) })
    },
  })
}
