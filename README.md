# Windmill

[![Go Reference](https://pkg.go.dev/badge/github.com/scmofeoluwa/windmill.svg)](https://pkg.go.dev/github.com/scmofeoluwa/windmill)
[![Go Report Card](https://goreportcard.com/badge/github.com/scmofeoluwa/windmill)](https://goreportcard.com/report/github.com/scmofeoluwa/windmill)
[![codecov](https://codecov.io/gh/scmofeoluwa/windmill/branch/main/graph/badge.svg)](https://codecov.io/gh/scmofeoluwa/windmill)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A real-time monitoring dashboard for [Watermill](https://watermill.io/) applications using Redis Streams. Windmill provides visibility into your message streams and Dead Letter Queue (DLQ), allowing you to monitor, debug, and manage failed messages.

## Features

- **Stream Monitoring** - View all Redis Streams with message counts, memory usage, and activity
- **Dead Letter Queue Management** - Inspect, requeue, or delete failed messages
- **Bulk Operations** - Requeue all DLQ messages with a single click

## Installation

```bash
go get github.com/scmofeoluwa/windmill
```

## Quick Start

```go
package main

import (
    "log"
    "net/http"

    "github.com/redis/go-redis/v9"
    "github.com/scmofeoluwa/windmill"
)

func main() {
    rc := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    wm, err := windmill.New(windmill.Config{
        RedisClient: rc,
        DLQName:     "poison_queue",
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Dashboard running on http://localhost:3000")
    http.ListenAndServe(":3000", wm.Handler())
}
```

> [!NOTE]
> Set `WINDMILL_USERNAME` and `WINDMILL_PASSWORD` environment variables for Basic Auth.

See the [examples/basic](./examples/basic) directory for a complete working example.

## Framework Integration

Windmill returns a standard `http.Handler`, making it compatible with any Go router:

```go
// Chi
r.Mount("/windmill", wm.Handler())

// Gin
r.Any("/windmill/*any", gin.WrapH(wm.Handler()))

// Echo
e.Any("/windmill/*", echo.WrapHandler(wm.Handler()))

// Fiber
app.Use("/windmill", adaptor.HTTPHandler(wm.Handler()))
```

## Roadmap

We're actively working on expanding Windmill's capabilities:

- [ ] **Consumer Group Monitoring** - View consumer groups, pending messages, and lag metrics
- [ ] **Message Search & Filtering** - Search messages by payload content or metadata
- [ ] **Stream Analytics** - Throughput graphs and historical metrics
- [ ] **Message Replay** - Replay specific messages to their original streams
- [ ] **Alerting** - Configurable alerts for DLQ thresholds and consumer lag

Have a feature request? [Open an issue](https://github.com/scmofeoluwa/windmill/issues)!

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
