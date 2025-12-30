import { ApiResponse, ErrorResponse } from './types'

export class ApiError extends Error {
  constructor(public status: number, public message: string) {
    super(message)
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    // If unauthorized, reload to trigger browser's Basic Auth dialog
    if (response.status === 401) {
      window.location.reload()
      throw new ApiError(response.status, 'Unauthorized')
    }

    let message = 'An error occurred'
    try {
      const errorData = (await response.json()) as ErrorResponse
      message = errorData.message
    } catch {
      message = response.statusText
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) {
    return null as T
  }

  const data = (await response.json()) as ApiResponse<T>
  return data.data
}

export const api = {
  getOverview: () => request<any>('/api/overview'),
  getStreams: () => request<any[]>('/api/streams'),
  getStream: (name: string) => request<any>(`/api/streams/${name}`),
  getStreamMessages: (name: string, params: any) => {
    const searchParams = new URLSearchParams()
    if (params.cursor) searchParams.set('cursor', params.cursor)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.order) searchParams.set('order', params.order)
    return request<any>(`/api/streams/${name}/messages?${searchParams.toString()}`)
  },
  getDLQStats: () => request<any>('/api/dlq'),
  getDLQMessages: (params: any) => {
    const searchParams = new URLSearchParams()
    if (params.cursor) searchParams.set('cursor', params.cursor)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.order) searchParams.set('order', params.order)
    return request<any>(`/api/dlq/messages?${searchParams.toString()}`)
  },
  requeueMessage: (id: string, payload?: any) =>
    request<void>(`/api/dlq/messages/${id}/requeue`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  requeueAll: () => request<{ requeued: number }>('/api/dlq/requeue-all', { method: 'POST' }),
  deleteDLQMessage: (id: string) =>
    request<void>(`/api/dlq/messages/${id}`, { method: 'DELETE' }),
  deleteStreamMessage: (name: string, id: string) =>
    request<void>(`/api/streams/${name}/messages/${id}`, { method: 'DELETE' }),
}
