package monitor

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"github.com/vmihailenco/msgpack"
)

func addTestMessage(t require.TestingT, client redis.UniversalClient, stream string, payload map[string]any) string {
	ctx := context.Background()

	payloadBytes, err := json.Marshal(payload)
	require.NoError(t, err)

	metadataBytes, err := msgpack.Marshal(map[string]string{})
	require.NoError(t, err)

	id, err := client.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: map[string]any{
			WatermillUUIDKey:     "test-uuid",
			WatermillPayloadKey:  string(payloadBytes),
			WatermillMetadataKey: string(metadataBytes),
		},
	}).Result()
	require.NoError(t, err)
	return id
}

func addDLQMessage(t require.TestingT, client redis.UniversalClient, dlqName, originalTopic string, payload map[string]any) string {
	ctx := context.Background()

	payloadBytes, err := json.Marshal(payload)
	require.NoError(t, err)

	metadata := map[string]string{
		TopicPoisonedKey:  originalTopic,
		ReasonPoisonedKey: "test error",
	}
	metadataBytes, err := msgpack.Marshal(metadata)
	require.NoError(t, err)

	id, err := client.XAdd(ctx, &redis.XAddArgs{
		Stream: dlqName,
		Values: map[string]any{
			WatermillUUIDKey:     "test-uuid",
			WatermillPayloadKey:  string(payloadBytes),
			WatermillMetadataKey: string(metadataBytes),
		},
	}).Result()
	require.NoError(t, err)
	return id
}

type MonitorTestSuite struct {
	suite.Suite
	mr      *miniredis.Miniredis
	client  redis.UniversalClient
	monitor *Monitor
	dlqName string
}

func (s *MonitorTestSuite) SetupTest() {
	s.mr = miniredis.RunT(s.T())
	s.client = redis.NewClient(&redis.Options{Addr: s.mr.Addr()})
	s.dlqName = "test_dlq"
	s.monitor = New(s.client, s.dlqName)
}

func (s *MonitorTestSuite) TearDownTest() {
	s.client.Close()
	s.mr.Close()
}

func (s *MonitorTestSuite) TestGetOverview() {
	ctx := context.Background()

	addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 1})
	addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 2})
	addTestMessage(s.T(), s.client, "payments.processed", map[string]any{"id": 3})
	addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 4})

	overview, err := s.monitor.GetOverview(ctx)
	s.Require().NoError(err)

	s.Equal(2, overview.TotalStreams)
	s.Equal(int64(3), overview.TotalMessages)
	s.Equal(int64(1), overview.TotalDLQMessages)
}

func TestMonitorSuite(t *testing.T) {
	suite.Run(t, new(MonitorTestSuite))
}

func TestParseStreamTimestamp(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		wantErr bool
	}{
		{"valid ID", "1704067200000-0", false},
		{"invalid format", "invalid", true},
		{"missing sequence", "1704067200000", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ts, err := ParseStreamTimestamp(tt.id)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, ts)
				require.False(t, ts.IsZero())
			}
		})
	}
}

func TestPaginationOpts_WithDefaults(t *testing.T) {
	tests := []struct {
		name     string
		opts     PaginationOpts
		expected PaginationOpts
	}{
		{
			name:     "empty opts",
			opts:     PaginationOpts{},
			expected: PaginationOpts{Limit: 50, Order: SortOrderDesc},
		},
		{
			name:     "limit zero",
			opts:     PaginationOpts{Limit: 0, Order: SortOrderAsc},
			expected: PaginationOpts{Limit: 50, Order: SortOrderAsc},
		},
		{
			name:     "valid opts",
			opts:     PaginationOpts{Limit: 25, Order: SortOrderAsc},
			expected: PaginationOpts{Limit: 25, Order: SortOrderAsc},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.opts.WithDefaults()
			require.Equal(t, tt.expected.Limit, result.Limit)
			require.Equal(t, tt.expected.Order, result.Order)
		})
	}
}
