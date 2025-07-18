# TrackFlow Consumer Service

A high-performance consumer service for processing tracking events from Kafka and storing them in ClickHouse.

## Overview

The consumer service is responsible for:
1. Consuming tracking events from Kafka
2. Processing and validating events
3. Batching events for efficient storage
4. Storing events in ClickHouse
5. Providing metrics and health endpoints

## Project Structure

```
consumer/
├── src/
│   ├── config/           # Configuration management
│   ├── services/         # Core service implementations
│   │   ├── clickhouse.service.ts  # ClickHouse client and batch processing
│   │   └── metrics.service.ts     # Prometheus metrics collection
│   ├── types/            # TypeScript type definitions
│   ├── index.ts          # Main application entry point
│   └── test/             # Test files
├── .env.example          # Example environment variables
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Key Components

### 1. Kafka Consumer (`index.ts`)
- Uses `kafkajs` for consuming messages
- Implements error handling and reconnection logic
- Processes messages in batches for efficiency
- Tracks consumer lag and offset metrics

### 2. ClickHouse Service (`services/clickhouse.service.ts`)
- Manages connections to ClickHouse
- Implements batch processing with configurable batch size and timeout
- Handles retries and error recovery
- Provides metrics for batch processing

### 3. Metrics Service (`services/metrics.service.ts`)
- Exposes Prometheus metrics endpoint
- Tracks message processing statistics
- Monitors consumer lag and error rates
- Provides health check endpoint

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Kafka (local or remote)
- ClickHouse (local or remote)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env` and update the values

### Configuration

Environment variables in `.env`:

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=trackflow-group
KAFKA_TOPIC=tracking-events

# ClickHouse Configuration
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=superman
CLICKHOUSE_DB=trackflow

# Application Settings
PORT=8002
NODE_ENV=development

# Batch Processing
BATCH_SIZE=100
BATCH_TIMEOUT_MS=5000
MAX_RETRIES=3
RETRY_DELAY_MS=1000
```

### Running Locally

1. Start the service:
   ```bash
   pnpm dev
   ```

2. Check the health endpoint:
   ```
   GET http://localhost:8002/health
   ```

3. View metrics:
   ```
   GET http://localhost:8002/metrics
   ```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics

## Testing

Run unit tests:
```bash
pnpm test
```

Run with test coverage:
```bash
pnpm test:coverage
```

## Monitoring

The service exposes Prometheus metrics at `/metrics`. Key metrics include:

- `kafka_messages_processed_total` - Total messages processed
- `kafka_message_errors_total` - Total processing errors
- `kafka_consumer_lag` - Current consumer lag
- `clickhouse_batch_size` - Size of batches being processed
- `clickhouse_insert_duration_seconds` - Time taken for ClickHouse inserts

## Deployment

### Building the Docker Image

```bash
docker build -t trackflow-consumer .
```

### Running with Docker Compose

See the main project's `docker-compose.yml` for an example of running the consumer with all dependencies.

## License

MIT
