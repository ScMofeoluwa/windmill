package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-redisstream/pkg/redisstream"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/redis/go-redis/v9"
	"github.com/scmofeoluwa/windmill"
)

var (
	redisAddr = "localhost:6379"
	dlqName   = "windmill_dlq"
	logger    = watermill.NewStdLogger(false, false)
)

func main() {
	ctx := context.Background()

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("could not connect to redis: %v", err)
	}

	publisher, err := redisstream.NewPublisher(
		redisstream.PublisherConfig{
			Client: redisClient,
		},
		logger,
	)
	if err != nil {
		log.Fatal(err)
	}

	subscriber, err := redisstream.NewSubscriber(
		redisstream.SubscriberConfig{
			Client: redisClient,
		},
		logger,
	)
	if err != nil {
		log.Fatal(err)
	}

	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		log.Fatal(err)
	}

	poisonQueue, err := middleware.PoisonQueue(publisher, dlqName)
	if err != nil {
		log.Fatal(err)
	}
	router.AddMiddleware(poisonQueue)

	router.AddConsumerHandler(
		"worker.1",
		"orders.created",
		subscriber,
		func(msg *message.Message) error {
			log.Printf("received message: %s", msg.UUID)
			// Randomly fail to test DLQ
			if rand.Intn(10) < 3 {
				return fmt.Errorf("random error processing message")
			}
			return nil
		},
	)

	router.AddConsumerHandler(
		"worker.2",
		"payments.processed",
		subscriber,
		func(msg *message.Message) error {
			log.Printf("received payment: %s", msg.UUID)
			return nil
		},
	)

	// Initialize Windmill
	wm, err := windmill.New(windmill.Config{
		RedisClient: redisClient,
		DLQName:     dlqName,
	})
	if err != nil {
		log.Fatal(err)
	}

	go produceMessages(ctx, publisher)

	go func() {
		if err := router.Run(ctx); err != nil {
			log.Fatal(err)
		}
	}()

	// 10. Start HTTP Server with Windmill Dashboard
	log.Printf("Windmill dashboard starting on http://localhost:3000")
	if err := http.ListenAndServe(":3000", wm.Handler()); err != nil {
		log.Fatal(err)
	}
}

func produceMessages(_ context.Context, publisher message.Publisher) {
	topics := []string{"orders.created", "payments.processed", "notifications.sent"}
	for {
		topic := topics[rand.Intn(len(topics))]
		msg := message.NewMessage(watermill.NewUUID(), fmt.Appendf(nil, `{"time": "%s", "data": "sample data"}`, time.Now().Format(time.RFC3339)))

		if err := publisher.Publish(topic, msg); err != nil {
			log.Printf("failed to publish message: %v", err)
		}

		time.Sleep(time.Second * time.Duration(rand.Intn(5)+1))
	}
}
