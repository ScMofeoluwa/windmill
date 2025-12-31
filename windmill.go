package windmill

import (
	"errors"
	"net/http"
	"os"

	"github.com/redis/go-redis/v9"

	"github.com/scmofeoluwa/windmill/internal/api"
	"github.com/scmofeoluwa/windmill/internal/monitor"
)

type Config struct {
	RedisClient redis.UniversalClient
	DLQName     string
}

type Windmill struct {
	handler http.Handler
}

func New(config Config) (*Windmill, error) {
	if config.RedisClient == nil {
		return nil, errors.New("windmill: redis client is required")
	}

	if config.DLQName == "" {
		return nil, errors.New("windmill: dlq name is required")
	}

	username := os.Getenv("WINDMILL_USERNAME")
	password := os.Getenv("WINDMILL_PASSWORD")

	if username == "" || password == "" {
		return nil, errors.New("windmill: WINDMILL_USERNAME and WINDMILL_PASSWORD environment variables are required")
	}

	mon := monitor.New(config.RedisClient, config.DLQName)
	apiHandler := api.New(mon)

	return &Windmill{
		handler: apiHandler.Handler(),
	}, nil
}

func (w *Windmill) Handler() http.Handler {
	return w.handler
}
