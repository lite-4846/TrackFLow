import Fastify, { FastifyInstance, FastifyBaseLogger } from 'fastify';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { ClickHouseService } from './services/clickhouse.service';
import { MetricsService } from './services/metrics.service';
import config from './config';

// Extend FastifyInstance to include error method
interface CustomFastifyInstance extends FastifyInstance {
  error: FastifyBaseLogger['error'];
}

class ConsumerApp {
  private server: CustomFastifyInstance;
  private kafka: Kafka;
  private consumer: any; // Will hold the Kafka consumer instance
  private clickhouse: ClickHouseService;
  private metrics: MetricsService;
  private isShuttingDown = false;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    const loggerConfig = process.env.NODE_ENV === 'production' 
      ? { level: 'info' } 
      : {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        };

    // Create server with proper type assertion
    const server = Fastify({
      logger: loggerConfig,
      disableRequestLogging: process.env.NODE_ENV === 'production',
    }) as unknown as CustomFastifyInstance;
    
    // Add error method if not present
    if (!server.error) {
      server.error = server.log.error.bind(server.log);
    }
    
    this.server = server;

    this.kafka = new Kafka({
      clientId: 'trackflow-consumer',
      brokers: [...config.kafka.brokers],
    });

    this.clickhouse = new ClickHouseService();
    this.metrics = new MetricsService();
  }

  async start() {
    try {
      await this.setupServer();
      await this.setupKafka();
      await this.setupGracefulShutdown();

      const port = parseInt(process.env.PORT || '8002', 10);
      await this.server.listen({ port, host: '0.0.0.0' });

      this.server.log.info(`Server is running on port ${port}`);
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }

  private async setupServer() {
    // Health check endpoint
    this.server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Metrics endpoint
    this.server.get('/metrics', async (request, reply) => {
      try {
        const metrics = await this.metrics.getMetrics();
        reply.header('Content-Type', this.metrics.getContentType());
        return metrics;
      } catch (err) {
        this.server.log.error(err);
        reply.status(500).send({ error: 'Failed to collect metrics' });
      }
    });
  }

  private async setupKafka() {
    // Store consumer instance for proper cleanup
    this.consumer = this.kafka.consumer({
      groupId: 'trackflow-group',
      sessionTimeout: 30000,  // 30 seconds
      heartbeatInterval: 10000,  // 10 seconds
      maxWaitTimeInMs: 1000,
      retry: {
        initialRetryTime: 1000,
        maxRetryTime: 30000,
        retries: 10,
      },
    });

    const MAX_RETRIES = 5;
    let retryCount = 0;

    const connectWithRetry = async () => {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: config.kafka.topic,
          fromBeginning: true,
        });

        await this.consumer.run({
          eachMessage: this.handleMessage.bind(this),
        });

        retryCount = 0; // Reset retry count on successful connection
        this.server.log.info('Kafka consumer connected and subscribed');
      } catch (error) {
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          this.server.error({ error }, 'Max retries reached, giving up');
          await this.shutdown();
          return;
        }

        const backoff = Math.min(1000 * Math.pow(2, retryCount), 30000);
        this.server.error(
          { error, attempt: retryCount, nextRetryIn: `${backoff}ms` },
          'Failed to connect to Kafka, retrying...'
        );
        await new Promise(resolve => setTimeout(resolve, backoff));
        return connectWithRetry();
      }
    };

    // Handle Kafka events
    this.consumer.on('consumer.disconnect', () => {
      this.server.log.warn('Kafka consumer disconnected');
      if (!this.isShuttingDown) {
        this.server.log.info('Attempting to reconnect...');
        connectWithRetry().catch(err => {
          this.server.error({ error: err }, 'Failed to reconnect to Kafka');
        });
      }
    });

    this.consumer.on('consumer.crash', async (error: any) => {
      this.server.error(
        { error },
        'Kafka consumer crashed, attempting to reconnect...'
      );
      if (!this.isShuttingDown) {
        await connectWithRetry().catch(err => {
          this.server.error({ error: err }, 'Failed to reconnect to Kafka after crash');
        });
      }
    });

    // Initial connection
    await connectWithRetry();
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload) {
    const endTimer = this.metrics.startTimer();
    
    try {
      const value = message.value?.toString();
      if (!value) {
        throw new Error('Empty message value');
      }
      
      const messageData = JSON.parse(value);
      
      // Basic validation
      if (!messageData || typeof messageData !== 'object') {
        throw new Error('Invalid message format: expected an object');
      }
      
      // Handle both single event and batched events
      const events = Array.isArray(messageData.events) ? messageData.events : [messageData];
      
      if (events.length === 0) {
        throw new Error('No events found in message');
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each event in the batch
      for (const event of events) {
        try {
          // Basic event validation
          if (!event || typeof event !== 'object' || !event.eventId) {
            this.server.log.warn({ event }, 'Skipping invalid event format');
            errorCount++;
            continue;
          }
          
          // Add to ClickHouse batch
          await this.clickhouse.addToBatch(event);
          successCount++;
          
        } catch (eventError) {
          this.server.log.error({
            error: eventError instanceof Error ? eventError.message : String(eventError),
            eventId: event?.eventId,
            topic,
            partition,
            offset: message.offset
          }, 'Error processing event in batch');
          errorCount++;
        }
      }
      
      // Update metrics
      if (successCount > 0) {
        this.metrics.incrementMessageCounter('success', successCount);
      }
      if (errorCount > 0) {
        this.metrics.incrementMessageCounter('error', errorCount);
      }
      
      endTimer({ status: 'success' });
      
    } catch (error) {
      this.server.log.error({
        error: error instanceof Error ? error.message : String(error),
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        rawMessage: message.value?.toString().substring(0, 1000) // First 1000 chars
      }, 'Error processing Kafka message');
      
      this.metrics.incrementMessageCounter('error');
      this.metrics.incrementErrorCounter('processing_error');
      endTimer({ status: 'error' });
    }
  }

  private async updateQueueMetrics() {
    // Implementation of queue metrics update
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      // Get the latest offsets for the topic
      const topicOffsets = await admin.fetchTopicOffsets('tracking-events');
      
      // Get the consumer group offsets
      const groupOffsets = await admin.fetchOffsets({
        groupId: 'trackflow-group',
        topics: ['tracking-events'],
      });

      // Calculate total lag across all partitions
      const lag = topicOffsets.reduce((total, topicOffset) => {
        try {
          // Find the corresponding consumer offset for this partition
          const groupPartition = groupOffsets[0]?.partitions?.find(
            (p: { partition: number }) => p.partition === topicOffset.partition
          );
          
          // Parse offsets safely, defaulting to 0 if invalid
          const partitionOffset = parseInt(topicOffset.offset, 10) || 0;
          const consumerOffsetValue = groupPartition?.offset 
            ? parseInt(groupPartition.offset, 10) 
            : 0;
            
          // Ensure we don't get negative lag
          const partitionLag = Math.max(0, partitionOffset - consumerOffsetValue);
          return total + partitionLag;
          
        } catch (error) {
          this.server.log.error(
            { error, partition: topicOffset.partition },
            'Error calculating lag for partition'
          );
          return total;
        }
      }, 0);

      // Update metrics using the available method
      // The actual method name will depend on your MetricsService implementation
      // This is a safe way to call it without TypeScript errors
      (this.metrics as any).updateQueueSize?.(lag) || 
      (this.metrics as any).setQueueSize?.(lag) ||
      this.server.log.warn('No compatible queue size update method found in metrics service');
      
      await admin.disconnect();
      
    } catch (error) {
      this.server.log.error(
        { error },
        'Error updating queue metrics'
      );
    }
  }

  private startQueueMetrics() {
    // Clear any existing interval
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Initial metrics update
    this.updateQueueMetrics().catch(error => 
      this.server.error({ error }, 'Initial queue metrics update failed')
    );
    
    // Update queue metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.updateQueueMetrics().catch(error =>
        this.server.error({ error }, 'Periodic queue metrics update failed')
      );
    }, 30000);
  }

  private async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.server.log.info('Shutting down gracefully...');
    
    try {
      // Clear metrics interval
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
      }
      
      // Close Kafka consumer if it exists
      if (this.consumer) {
        this.server.log.info('Disconnecting Kafka consumer...');
        try {
          await this.consumer.disconnect();
          this.server.log.info('Kafka consumer disconnected');
        } catch (error) {
          this.server.error({ error }, 'Error disconnecting Kafka consumer');
        }
      }
      
      // Close ClickHouse connection
      if (this.clickhouse) {
        this.server.log.info('Closing ClickHouse connection...');
        try {
          await this.clickhouse.close();
          this.server.log.info('ClickHouse connection closed');
        } catch (error) {
          this.server.error({ error }, 'Error closing ClickHouse connection');
        }
      }
      
      // Close HTTP server if it's running
      if (this.server) {
        this.server.log.info('Closing HTTP server...');
        try {
          await this.server.close();
          this.server.log.info('HTTP server closed');
        } catch (error) {
          this.server.error({ error }, 'Error closing HTTP server');
        }
      }
      
      this.server.log.info('Shutdown complete');
      process.exit(0);
      
    } catch (error) {
      this.server.error({ error }, 'Error during shutdown');
      process.exit(1);
    } 
  }

  private async setupGracefulShutdown() {
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }
}

// Start the application
const app = new ConsumerApp();
app.start().catch(console.error);
