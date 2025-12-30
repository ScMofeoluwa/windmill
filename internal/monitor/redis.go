package monitor

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type RedisStream struct {
	client redis.UniversalClient
}

func NewRedisStream(client redis.UniversalClient) *RedisStream {
	return &RedisStream{client: client}
}

func (r *RedisStream) ScanStreams(ctx context.Context) ([]string, error) {
	var (
		cursor  uint64
		streams []string
	)

	for {
		keys, nextCursor, err := r.client.ScanType(ctx, cursor, "*", 100, "stream").Result()
		if err != nil {
			return nil, err
		}

		streams = append(streams, keys...)
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return streams, nil
}

func (r *RedisStream) GetStreamInfo(ctx context.Context, stream string) (*redis.XInfoStream, error) {
	return r.client.XInfoStream(ctx, stream).Result()
}

func (r *RedisStream) GetStreamLength(ctx context.Context, stream string) (int64, error) {
	return r.client.XLen(ctx, stream).Result()
}

func (r *RedisStream) GetMemoryUsage(ctx context.Context, stream string) (int64, error) {
	return r.client.MemoryUsage(ctx, stream).Result()
}

func (r *RedisStream) ReadMessages(ctx context.Context, stream string, opts PaginationOpts) ([]redis.XMessage, error) {
	opts = opts.WithDefaults()
	switch opts.Order {
	case SortOrderAsc:
		return r.readRange(ctx, stream, opts)
	case SortOrderDesc:
		return r.readRevRange(ctx, stream, opts)
	default:
		return nil, fmt.Errorf("invalid order: %s", opts.Order)
	}
}

func (r *RedisStream) ReadMessage(ctx context.Context, stream, id string) (*redis.XMessage, error) {
	messages, err := r.client.XRangeN(ctx, stream, id, id, 1).Result()
	if err != nil {
		return nil, err
	}

	if len(messages) == 0 {
		return nil, nil
	}

	return &messages[0], nil
}

func (r *RedisStream) AddMessage(ctx context.Context, stream string, data map[string]any) (string, error) {
	return r.client.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: data,
	}).Result()
}

func (r *RedisStream) DeleteMessage(ctx context.Context, stream, id string) error {
	_, err := r.client.XDel(ctx, stream, id).Result()
	return err
}

func (r *RedisStream) readRange(ctx context.Context, stream string, opts PaginationOpts) ([]redis.XMessage, error) {
	start := opts.Cursor
	if start == "" {
		start = "-"
	} else {
		start = "(" + start
	}

	return r.client.XRangeN(ctx, stream, start, "+", opts.Limit).Result()
}

func (r *RedisStream) readRevRange(ctx context.Context, stream string, opts PaginationOpts) ([]redis.XMessage, error) {
	start := opts.Cursor
	if start == "" {
		start = "+"
	} else {
		start = "(" + start
	}

	return r.client.XRevRangeN(ctx, stream, start, "-", opts.Limit).Result()
}
