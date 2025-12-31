package monitor

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/suite"
)

type StreamTestSuite struct {
	suite.Suite
	mr      *miniredis.Miniredis
	client  redis.UniversalClient
	service *StreamService
	dlqName string
}

func (s *StreamTestSuite) SetupTest() {
	s.mr = miniredis.RunT(s.T())
	s.client = redis.NewClient(&redis.Options{Addr: s.mr.Addr()})
	s.dlqName = "test_dlq"
	stream := NewRedisStream(s.client)
	s.service = NewStreamService(stream, s.dlqName)
}

func (s *StreamTestSuite) TearDownTest() {
	s.client.Close()
	s.mr.Close()
}

func (s *StreamTestSuite) TestGetStreams() {
	ctx := context.Background()

	addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 1})
	addTestMessage(s.T(), s.client, "payments.processed", map[string]any{"id": 2})
	addDLQMessage(s.T(), s.client, s.dlqName, "orders.created", map[string]any{"id": 3})

	streams, err := s.service.GetStreams(ctx)
	s.Require().NoError(err)

	s.Len(streams, 2)

	streamNames := make([]string, len(streams))
	for i, stream := range streams {
		streamNames[i] = stream.Name
	}

	s.Contains(streamNames, "orders.created")
	s.Contains(streamNames, "payments.processed")
	s.NotContains(streamNames, s.dlqName)
}

func (s *StreamTestSuite) TestGetStreamDetail() {
	s.T().Skip("miniredis does not fully support XInfoStream FirstEntry/LastEntry")

	ctx := context.Background()

	firstID := addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 1})
	lastID := addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 2})

	detail, err := s.service.GetStreamDetail(ctx, "orders.created")
	s.Require().NoError(err)
	s.Require().NotNil(detail)

	s.Equal("orders.created", detail.Name)
	s.Equal(int64(2), detail.Length)

	s.Require().NotNil(detail.FirstEntryID)
	s.Require().NotNil(detail.LastEntryID)
	s.Equal(firstID, *detail.FirstEntryID)
	s.Equal(lastID, *detail.LastEntryID)
}

func (s *StreamTestSuite) TestGetStreamMessages() {
	ctx := context.Background()

	addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 1})
	addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 2})
	addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 3})

	msgs, err := s.service.GetStreamMessages(ctx, "orders.created", PaginationOpts{
		Limit: 10,
		Order: SortOrderDesc,
	})
	s.Require().NoError(err)

	s.Len(msgs.Messages, 3)
	s.Equal(int64(3), msgs.TotalCount)
	s.False(msgs.HasMore)
}

func (s *StreamTestSuite) TestGetStreamMessages_Pagination() {
	ctx := context.Background()

	for i := range 5 {
		addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": i})
	}

	page1, err := s.service.GetStreamMessages(ctx, "orders.created", PaginationOpts{
		Limit: 2,
		Order: SortOrderAsc,
	})
	s.Require().NoError(err)
	s.Len(page1.Messages, 2)
	s.True(page1.HasMore)
	s.NotEmpty(page1.NextCursor)

	page2, err := s.service.GetStreamMessages(ctx, "orders.created", PaginationOpts{
		Limit:  2,
		Order:  SortOrderAsc,
		Cursor: page1.NextCursor,
	})
	s.Require().NoError(err)
	s.Len(page2.Messages, 2)
	s.True(page2.HasMore)

	s.NotEqual(page1.Messages[0].ID, page2.Messages[0].ID)
}

func (s *StreamTestSuite) TestDeleteMessage() {
	ctx := context.Background()

	msgID := addTestMessage(s.T(), s.client, "orders.created", map[string]any{"id": 1})

	msg, err := s.service.GetMessage(ctx, "orders.created", msgID)
	s.Require().NoError(err)
	s.NotNil(msg)

	err = s.service.DeleteMessage(ctx, "orders.created", msgID)
	s.Require().NoError(err)

	msg, err = s.service.GetMessage(ctx, "orders.created", msgID)
	s.Require().NoError(err)
	s.Nil(msg)
}

func TestStreamSuite(t *testing.T) {
	suite.Run(t, new(StreamTestSuite))
}
