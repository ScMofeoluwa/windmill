package monitor

import (
	"context"
	"time"

	"golang.org/x/sync/errgroup"
)

type StreamService struct {
	monitor *RedisStream
	dlqName string
}

func NewStreamService(monitor *RedisStream, dlqName string) *StreamService {
	return &StreamService{
		monitor: monitor,
		dlqName: dlqName,
	}
}

func (s *StreamService) GetStreams(ctx context.Context) ([]StreamInfo, error) {
	streams, err := s.monitor.ScanStreams(ctx)
	if err != nil {
		return nil, err
	}

	streamsInfo := make([]StreamInfo, len(streams))
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10)

	for i, name := range streams {
		if name == s.dlqName {
			continue
		}

		g.Go(func() error {
			meta, err := s.monitor.GetStreamInfo(ctx, name)
			if err != nil {
				return nil
			}

			memory, err := s.monitor.GetMemoryUsage(ctx, name)
			if err != nil {
				return nil
			}

			var (
				lastEntryID  *string
				lastActivity *time.Time
			)

			if meta.LastEntry.ID != "" {
				id := meta.LastEntry.ID
				lastEntryID = &id

				if ts, err := ParseStreamTimestamp(*lastEntryID); err == nil {
					lastActivity = ts
				}
			}

			streamsInfo[i] = StreamInfo{
				Name:         name,
				Length:       meta.Length,
				MemoryBytes:  memory,
				LastEntryID:  lastEntryID,
				LastActivity: lastActivity,
			}

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	var result []StreamInfo
	for _, info := range streamsInfo {
		if info.Name != "" {
			result = append(result, info)
		}
	}

	return result, nil
}

func (s *StreamService) GetStreamDetail(ctx context.Context, stream string) (*StreamDetail, error) {
	meta, err := s.monitor.GetStreamInfo(ctx, stream)
	if err != nil {
		return nil, err
	}

	memory, err := s.monitor.GetMemoryUsage(ctx, stream)
	if err != nil {
		return nil, err
	}

	var (
		firstEntryID *string
		lastEntryID  *string
		lastActivity *time.Time
	)

	if meta.FirstEntry.ID != "" {
		id := meta.FirstEntry.ID
		firstEntryID = &id
	}

	if meta.LastEntry.ID != "" {
		id := meta.LastEntry.ID
		lastEntryID = &id

		if ts, err := ParseStreamTimestamp(*lastEntryID); err == nil {
			lastActivity = ts
		}
	}

	return &StreamDetail{
		StreamInfo: StreamInfo{
			Name:         stream,
			Length:       meta.Length,
			MemoryBytes:  memory,
			LastEntryID:  lastEntryID,
			LastActivity: lastActivity,
		},
		FirstEntryID: firstEntryID,
	}, nil
}

func (s *StreamService) GetStreamMessages(ctx context.Context, stream string, opts PaginationOpts) (*MessageList[Message], error) {
	messages, err := s.monitor.ReadMessages(ctx, stream, opts)
	if err != nil {
		return nil, err
	}

	totalCount, err := s.monitor.GetStreamLength(ctx, stream)
	if err != nil {
		return nil, err
	}

	result := make([]Message, 0, len(messages))
	for _, msg := range messages {
		ts, err := ParseStreamTimestamp(msg.ID)
		if err != nil {
			return nil, err
		}

		wmMsg, err := ParseWatermillMessage(msg.Values)
		if err != nil {
			return nil, err
		}

		result = append(result, Message{
			ID:        msg.ID,
			Payload:   wmMsg.Payload,
			Timestamp: *ts,
		})
	}

	hasMore := len(messages) == int(opts.Limit)
	var nextCursor string
	if hasMore && len(messages) > 0 {
		nextCursor = messages[len(messages)-1].ID
	}

	return &MessageList[Message]{
		Messages:   result,
		TotalCount: totalCount,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

func (s *StreamService) GetMessage(ctx context.Context, stream, id string) (*Message, error) {
	msg, err := s.monitor.ReadMessage(ctx, stream, id)
	if err != nil {
		return nil, err
	}

	if msg == nil {
		return nil, nil
	}

	ts, err := ParseStreamTimestamp(msg.ID)
	if err != nil {
		return nil, err
	}

	wmMsg, err := ParseWatermillMessage(msg.Values)
	if err != nil {
		return nil, err
	}

	return &Message{
		ID:        msg.ID,
		Payload:   wmMsg.Payload,
		Timestamp: *ts,
	}, nil
}

func (s *StreamService) DeleteMessage(ctx context.Context, stream, id string) error {
	return s.monitor.DeleteMessage(ctx, stream, id)
}
