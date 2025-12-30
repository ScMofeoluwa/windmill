package monitor

import (
	"context"

	"github.com/redis/go-redis/v9"
)

type Options struct {
	RedisClient redis.UniversalClient
	DLQName     string
}

type Monitor struct {
	streams *StreamService
	dlq     *DLQService
}

func New(opts Options) *Monitor {
	redisStream := NewRedisStream(opts.RedisClient)

	return &Monitor{
		streams: NewStreamService(redisStream, opts.DLQName),
		dlq:     NewDLQService(redisStream, opts.DLQName),
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
