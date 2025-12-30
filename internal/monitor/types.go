//go:generate go-enum --marshal
package monitor

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Watermill message keys
const (
	WatermillUUIDKey     = "_watermill_message_uuid"
	WatermillPayloadKey  = "payload"
	WatermillMetadataKey = "metadata"
)

// Watermill PoisonQueue metadata keys
const (
	ReasonPoisonedKey     = "reason_poisoned"
	TopicPoisonedKey      = "topic_poisoned"
	HandlerPoisonedKey    = "handler_poisoned"
	SubscriberPoisonedKey = "subscriber_poisoned"
)

// ENUM(asc, desc)
type SortOrder string

type StatsOverview struct {
	TotalStreams     int   `json:"total_streams"`
	TotalMessages    int64 `json:"total_messages"`
	TotalDLQMessages int64 `json:"total_dlq_messages"`
}

type PaginationOpts struct {
	Cursor string
	Limit  int64
	Order  SortOrder
}

type StreamInfo struct {
	Name         string     `json:"name"`
	Length       int64      `json:"length"`
	MemoryBytes  int64      `json:"memory_bytes"`
	LastEntryID  *string    `json:"last_entry_id,omitempty"`
	LastActivity *time.Time `json:"last_activity"`
}

type StreamDetail struct {
	StreamInfo
	FirstEntryID *string `json:"first_entry_id,omitempty"`
}

type Message struct {
	ID        string         `json:"id"`
	Payload   map[string]any `json:"payload"`
	Timestamp time.Time      `json:"timestamp"`
}

type MessageList[T any] struct {
	Messages   []T    `json:"messages"`
	TotalCount int64  `json:"total_count"`
	HasMore    bool   `json:"has_more"`
	NextCursor string `json:"next_cursor,omitempty"`
}

type DLQMessage struct {
	ID            string         `json:"id"`
	Payload       map[string]any `json:"payload"`
	Timestamp     time.Time      `json:"timestamp"`
	OriginalTopic string         `json:"original_topic"`
	Error         string         `json:"error"`
}

type WatermillMessage struct {
	UUID     string
	Payload  map[string]any
	Metadata map[string]string
}

func (p PaginationOpts) WithDefaults() PaginationOpts {
	if p.Limit == 0 {
		p.Limit = 50
	}

	if p.Order == "" {
		p.Order = SortOrderDesc
	}

	return p
}

func ParseStreamTimestamp(id string) (*time.Time, error) {
	i := strings.IndexByte(id, '-')
	if i == -1 {
		return nil, fmt.Errorf("invalid stream id: %q", id)
	}

	ms, err := strconv.ParseInt(id[:i], 10, 64)
	if err != nil {
		return nil, err
	}

	t := time.UnixMilli(ms)
	return &t, nil
}

func ParseWatermillMessage(values map[string]any) (*WatermillMessage, error) {
	msg := &WatermillMessage{
		Metadata: make(map[string]string),
		Payload:  make(map[string]any),
	}

	if uuid, ok := values[WatermillUUIDKey].(string); ok {
		msg.UUID = uuid
	}

	if payload, ok := values[WatermillPayloadKey].(string); ok && payload != "" {
		if err := json.Unmarshal([]byte(payload), &msg.Payload); err != nil {
			return nil, fmt.Errorf("failed to parse payload: %w", err)
		}
	}

	if metadata, ok := values[WatermillMetadataKey].(string); ok && metadata != "" && metadata != "{}" {
		if err := json.Unmarshal([]byte(metadata), &msg.Metadata); err != nil {
			return nil, fmt.Errorf("failed to parse metadata: %w", err)
		}
	}

	return msg, nil
}
