package monitor

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/suite"
)

type DLQTestSuite struct {
	suite.Suite
	mr      *miniredis.Miniredis
	client  redis.UniversalClient
	service *DLQService
	dlqName string
}

func (s *DLQTestSuite) SetupTest() {
	s.mr = miniredis.RunT(s.T())
	s.client = redis.NewClient(&redis.Options{Addr: s.mr.Addr()})
	s.dlqName = "test_dlq"
	stream := NewRedisStream(s.client)
	s.service = NewDLQService(stream, s.dlqName)
}

func (s *DLQTestSuite) TearDownTest() {
	s.client.Close()
	s.mr.Close()
}

func (s *DLQTestSuite) TestGetStats() {
	ctx := context.Background()

	addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 1})
	addDLQMessage(s.T(), s.client, s.dlqName, "payments.processed", map[string]any{"id": 2})

	stats, err := s.service.GetStats(ctx)
	s.Require().NoError(err)

	s.Equal(s.dlqName, stats.Name)
	s.Equal(int64(2), stats.Length)
}

func (s *DLQTestSuite) TestGetMessages() {
	ctx := context.Background()

	addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 1})
	addDLQMessage(s.T(), s.client, s.dlqName, "payments.processed", map[string]any{"id": 2})

	msgs, err := s.service.GetMessages(ctx, PaginationOpts{Limit: 10, Order: SortOrderDesc})
	s.Require().NoError(err)

	s.Len(msgs.Messages, 2)

	topics := []string{msgs.Messages[0].OriginalTopic, msgs.Messages[1].OriginalTopic}
	s.Contains(topics, "orders.created")
	s.Contains(topics, "payments.processed")
}

func (s *DLQTestSuite) TestRequeueMessage() {
	ctx := context.Background()

	msgID := addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 1})

	err := s.service.RequeueMessage(ctx, msgID, nil)
	s.Require().NoError(err)

	msg, err := s.service.GetMessage(ctx, msgID)
	s.Require().NoError(err)
	s.Nil(msg)

	length, err := s.client.XLen(ctx, "orders.created").Result()
	s.Require().NoError(err)
	s.Equal(int64(1), length)
}

func (s *DLQTestSuite) TestRequeueAll() {
	ctx := context.Background()

	addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 1})
	addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 2})
	addDLQMessage(s.T(), s.client, s.dlqName, "payments.processed", map[string]any{"id": 3})

	count, err := s.service.RequeueAll(ctx)
	s.Require().NoError(err)
	s.Equal(int64(3), count)

	stats, err := s.service.GetStats(ctx)
	s.Require().NoError(err)
	s.Equal(int64(0), stats.Length)
}

func (s *DLQTestSuite) TestDeleteMessage() {
	ctx := context.Background()

	msgID := addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 1})

	err := s.service.DeleteMessage(ctx, msgID)
	s.Require().NoError(err)

	msg, err := s.service.GetMessage(ctx, msgID)
	s.Require().NoError(err)
	s.Nil(msg)
}

func TestDLQSuite(t *testing.T) {
	suite.Run(t, new(DLQTestSuite))
}
