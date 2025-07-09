// consumer/src/consumer.ts
import { Kafka, logLevel, Consumer } from 'kafkajs';
import { ClickHouseService } from './services/clickhouse.service';
import { TrackEvent } from './types/events';
import config from './config';

// Initialize services
const clickhouse = new ClickHouseService();

// Initialize Kafka client
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 10000,
  },
});

const consumer = kafka.consumer({
  groupId: config.kafka.groupId,
  allowAutoTopicCreation: true,
  sessionTimeout: 30000,
  heartbeatInterval: 10000,
  maxInFlightRequests: 5, // Process up to 5 batches in parallel
  maxWaitTimeInMs: 250, // Maximum amount of time to wait for new data
  minBytes: 1,
  maxBytes: 1048576, // 1MB
});

const topic = config.kafka.topic;

async function processEvent(events: TrackEvent[]) {
  events.forEach(async (event) => {
    try {
      if (!event.eventId) {
        console.warn('Received event with no eventId, skipping');
        return;
      }
      console.log(`Adding ${event.eventType} event to batch:`, event.eventId);
      await clickhouse.addToBatch(event);
    } catch (error) {
      console.error(`Error adding event to batch:`, error);
      // TODO: Implement dead letter queue for failed events
    }
  });
}

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down consumer...');
  try {
    // Disconnect from Kafka
    await consumer.disconnect();
    console.log('Disconnected from Kafka');

    // Flush any remaining events in the batch
    console.log('Flushing remaining events...');
    await clickhouse.flush();

    // Close ClickHouse connection
    await clickhouse.close();
    console.log('Consumer shutdown complete');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

async function startConsumer() {
  let isConnected = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000; // 5 seconds

  const connect = async () => {
    try {
      await consumer.connect();
      isConnected = true;
      reconnectAttempts = 0;
      console.log('Connected to Kafka');

      await consumer.subscribe({
        topic,
        fromBeginning: config.env !== 'production', // Only read from beginning in non-production
      });
      console.log(`Subscribed to topic: ${topic}`);

      return true;
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      isConnected = false;
      return false;
    }
  };

  // Set up error handling
  consumer.on('consumer.crash', async (event) => {
    console.error('Consumer crashed:', event.payload.error);
    isConnected = false;
    await handleReconnect();
  });

  consumer.on('consumer.disconnect', async () => {
    console.log('Consumer disconnected');
    isConnected = false;
    await handleReconnect();
  });

  const handleReconnect = async () => {
    if (isConnected || reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    reconnectAttempts++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts);

    console.log(
      `Attempting to reconnect (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms...`
    );

    setTimeout(async () => {
      const connected = await connect();
      if (connected) {
        await consume();
      } else if (reconnectAttempts < maxReconnectAttempts) {
        await handleReconnect();
      } else {
        console.error('Max reconnection attempts reached. Exiting...');
        process.exit(1);
      }
    }, delay);
  };

  const consume = async () => {
    try {
      await consumer.run({
        autoCommit: true,
        autoCommitInterval: 5000,
        autoCommitThreshold: 100,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (!value) {
              console.warn('Received empty message value');
              return;
            }

            const event = JSON.parse(value) as {events: TrackEvent[]};
            await processEvent(event.events);
          } catch (error) {
            console.error('Error processing message:', error);
            // TODO: Implement dead letter queue for unprocessable messages
          }
        },
      });

      console.log('Consumer is running...');
    } catch (error) {
      console.error('Error in consumer:', error);
      throw error;
    }
  };

  try {
    const connected = await connect();
    if (connected) {
      await consume();
    } else {
      await handleReconnect();
    }
  } catch (error) {
    console.error('Fatal error in consumer:', error);
    process.exit(1);
  }
}

// Set up signal handlers for graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the consumer
startConsumer().catch((error) => {
  console.error('Failed to start consumer:', error);
  process.exit(1);
});
