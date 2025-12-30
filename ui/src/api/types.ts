export type SortOrder = 'asc' | 'desc'

export interface StatsOverview {
  total_streams: number
  total_messages: number
  total_dlq_messages: number
}

export interface PaginationOpts {
  cursor?: string
  limit?: number
  order?: SortOrder
}

export interface StreamInfo {
  name: string
  length: number
  memory_bytes: number
  last_entry_id?: string
  last_activity?: string
}

export interface StreamDetail extends StreamInfo {
  first_entry_id?: string
}

export interface Message {
  id: string
  payload: Record<string, any>
  timestamp: string
}

export interface MessageList<T> {
  messages: T[]
  total_count: number
  has_more: boolean
  next_cursor?: string
}

export interface DLQMessage {
  id: string
  payload: Record<string, any>
  timestamp: string
  original_topic: string
  error: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface ErrorResponse {
  success: boolean
  message: string
}
