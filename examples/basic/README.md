# Basic Example

This example demonstrates a complete Windmill setup with Watermill, Redis Streams, and a Poison Queue.

## Prerequisites

- Redis running on `localhost:6379`
- Go 1.21+

## Setup

### 1. Set Authentication Credentials

Windmill requires Basic Auth. Set these environment variables before running:

```bash
export WINDMILL_USERNAME=admin
export WINDMILL_PASSWORD=secret
```

### 2. Start Redis

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 3. Run the Example

```bash
go run main.go
```

### 4. Open the Dashboard

Visit [http://localhost:3000](http://localhost:3000) - your browser will prompt for the credentials you set above.

## What This Example Does

1. **Publishes messages** to random topics (`orders.created`, `payments.processed`, `notifications.sent`)
2. **Consumes messages** with handlers that randomly fail ~30% of the time
3. **Routes failed messages** to the Dead Letter Queue (DLQ)
4. **Serves the Windmill dashboard** for monitoring and managing messages

## Features Demonstrated

- Stream monitoring with message counts and memory usage
- DLQ management (view, requeue, delete failed messages)
- Real-time activity tracking
