# TrackFlow Test Scripts

This directory contains test scripts for the TrackFlow analytics system. These scripts help you generate test events to verify the end-to-end flow of the tracking system.

## Prerequisites

- Node.js (v16 or higher)
- pnpm (recommended) or npm
- A running instance of the TrackFlow backend
- Kafka and ClickHouse services (if testing the full stack)

## Setup

1. Install dependencies:
   ```bash
   cd tests
   pnpm install
   ```

2. Configure environment variables by copying the example `.env` file:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file to match your setup.

## Available Scripts

### Generate Test Events

Generate and send test tracking events to the backend:

```bash
# Generate 10 test events (default)
pnpm generate-events

# Generate a specific number of events
EVENT_COUNT=50 pnpm generate-events

# Use a different API endpoint
API_BASE_URL=http://your-backend-url pnpm generate-events
```

### Environment Variables

You can customize the test script behavior using the following environment variables:

- `API_BASE_URL`: Base URL of your TrackFlow backend (default: `http://localhost:3000`)
- `API_KEY`: API key for authentication (default: `test-api-key`)
- `EVENT_COUNT`: Number of events to generate (default: `10`)

## Test Event Types

The test script generates the following types of events:

1. **Page View**: Simulates page loads with various URLs and referrers
2. **Click**: Simulates user clicks on page elements
3. **Error**: Simulates JavaScript errors
4. **Performance**: Simulates web performance metrics

Each event includes realistic data such as:
- Random IP addresses
- Realistic user agents
- Viewport and screen dimensions
- Timestamps
- Session and user tracking

## Verifying Events

After running the test script, you can verify that events were processed correctly by:

1. Checking the backend logs for successful event ingestion
2. Querying ClickHouse directly:
   ```sql
   SELECT event_type, count() as count FROM events GROUP BY event_type;
   ```
3. Checking the Kafka topic for processed messages

## Troubleshooting

- **Connection refused**: Ensure your backend is running and accessible
- **Authentication errors**: Verify the API key matches your backend configuration
- **Event not processed**: Check Kafka consumer logs for errors
- **High latency**: The script includes random delays between events (50-500ms) to simulate real traffic

## License

MIT
