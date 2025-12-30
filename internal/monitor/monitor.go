package monitor

import (
	"context"

	"github.com/redis/go-redis/v9"
)

type Monitor struct {
	streams *StreamService
	dlq     *DLQService
}

func New(redisClient redis.UniversalClient, dlqName string) *Monitor {
	redisStream := NewRedisStream(redisClient)

	return &Monitor{
		streams: NewStreamService(redisStream, dlqName),
		dlq:     NewDLQService(redisStream, dlqName),
	}
}

func (m *Monitor) Streams() *StreamService {
	return m.streams
}

func (m *Monitor) DLQ() *DLQService {
	return m.dlq
}

func (m *Monitor) GetOverview(ctx context.Context) (*StatsOverview, error) {
	streams, err := m.streams.GetStreams(ctx)
	if err != nil {
		return nil, err
	}

	dlqStats, err := m.dlq.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	var totalMessages int64
	for _, s := range streams {
		totalMessages += s.Length
	}

	return &StatsOverview{
		TotalStreams:     len(streams),
		TotalMessages:    totalMessages,
		TotalDLQMessages: dlqStats.Length,
	}, nil
}
