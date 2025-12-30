package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"sync/atomic"
	"time"

	"golang.org/x/sync/errgroup"
)

type DLQService struct {
	monitor *RedisStream
	dlqName string
}

func NewDLQService(monitor *RedisStream, dlqName string) *DLQService {
	return &DLQService{
		monitor: monitor,
		dlqName: dlqName,
	}
}

func (d *DLQService) GetStats(ctx context.Context) (*StreamInfo, error) {
	meta, err := d.monitor.GetStreamInfo(ctx, d.dlqName)
	if err != nil {
		return nil, err
	}

	memory, err := d.monitor.GetMemoryUsage(ctx, d.dlqName)
	if err != nil {
		return nil, err
	}

	var (
		lastEntryID  *string
		lastActivity *time.Time
	)

	if meta.LastEntry.ID != "" {
		id := meta.LastEntry.ID
		lastEntryID = &id

		if ts, err := ParseStreamTimestamp(id); err == nil {
			lastActivity = ts
		}
	}

	return &StreamInfo{
		Name:         d.dlqName,
		Length:       meta.Length,
		MemoryBytes:  memory,
		LastEntryID:  lastEntryID,
		LastActivity: lastActivity,
	}, nil
}

func (d *DLQService) GetMessages(ctx context.Context, opts PaginationOpts) (*MessageList[DLQMessage], error) {
	messages, err := d.monitor.ReadMessages(ctx, d.dlqName, opts)
	if err != nil {
		return nil, err
	}

	totalCount, err := d.monitor.GetStreamLength(ctx, d.dlqName)
	if err != nil {
		return nil, err
	}

	result := make([]DLQMessage, 0, len(messages))
	for _, msg := range messages {
		dlqMsg, err := d.parseMessage(msg.ID, msg.Values)
		if err != nil {
			return nil, err
		}
		result = append(result, *dlqMsg)
	}

	hasMore := len(messages) == int(opts.Limit)
	var nextCursor string
	if hasMore && len(messages) > 0 {
		nextCursor = messages[len(messages)-1].ID
	}

	return &MessageList[DLQMessage]{
		Messages:   result,
		TotalCount: totalCount,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

func (d *DLQService) GetMessage(ctx context.Context, id string) (*DLQMessage, error) {
	msg, err := d.monitor.ReadMessage(ctx, d.dlqName, id)
	if err != nil {
		return nil, err
	}

	if msg == nil {
		return nil, nil
	}

	return d.parseMessage(msg.ID, msg.Values)
}

func (d *DLQService) RequeueMessage(ctx context.Context, id string, payload map[string]any) error {
	msg, err := d.GetMessage(ctx, id)
	if err != nil {
		return err
	}
	if msg == nil {
		return fmt.Errorf("message not found: %s", id)
	}

	if payload != nil {
		msg.Payload = payload
	}

	return d.requeue(ctx, msg)
}

func (d *DLQService) RequeueAll(ctx context.Context) (int64, error) {
	var requeued atomic.Int64

	opts := PaginationOpts{
		Limit: 100,
		Order: SortOrderAsc,
	}

	for {
		list, err := d.GetMessages(ctx, opts)
		if err != nil {
			return requeued.Load(), err
		}

		if len(list.Messages) == 0 {
			break
		}

		errG, grpCtx := errgroup.WithContext(ctx)
		errG.SetLimit(10)

		for _, msg := range list.Messages {
			errG.Go(func() error {
				if err := d.requeue(grpCtx, &msg); err != nil {
					return fmt.Errorf("failed to requeue message %s: %w", msg.ID, err)
				}

				requeued.Add(1)
				return nil
			})
		}

		if err := errG.Wait(); err != nil {
			return requeued.Load(), err
		}

		opts.Cursor = list.NextCursor
	}

	return requeued.Load(), nil
}

func (d *DLQService) requeue(ctx context.Context, msg *DLQMessage) error {
	if msg.OriginalTopic == "" {
		return fmt.Errorf("original topic not found in message metadata")
	}

	payloadBytes, err := json.Marshal(msg.Payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	newMsg := map[string]any{
		WatermillPayloadKey:  string(payloadBytes),
		WatermillMetadataKey: "{}",
	}

	_, err = d.monitor.AddMessage(ctx, msg.OriginalTopic, newMsg)
	if err != nil {
		return fmt.Errorf("failed to publish to original topic: %w", err)
	}

	return d.DeleteMessage(ctx, msg.ID)
}

func (d *DLQService) DeleteMessage(ctx context.Context, id string) error {
	return d.monitor.DeleteMessage(ctx, d.dlqName, id)
}

func (d *DLQService) parseMessage(id string, values map[string]any) (*DLQMessage, error) {
	ts, err := ParseStreamTimestamp(id)
	if err != nil {
		return nil, err
	}

	wmMsg, err := ParseWatermillMessage(values)
	if err != nil {
		return nil, err
	}

	return &DLQMessage{
		ID:            id,
		Payload:       wmMsg.Payload,
		Timestamp:     *ts,
		OriginalTopic: wmMsg.Metadata[TopicPoisonedKey],
		Error:         wmMsg.Metadata[ReasonPoisonedKey],
	}, nil
}
