import Fastify, { FastifyInstance } from 'fastify';
import { Kafka } from 'kafkajs';
import { ClickHouseService } from './services/clickhouse.service';
import { MetricsService } from './services/metrics.service';
import { config } from './config';

class ConsumerApp {
  private server: FastifyInstance;
  private kafka: Kafka;
  private clickhouse: ClickHouseService;
  private metrics: MetricsService;
  private isShuttingDown = false;

  constructor() {
    this.server = Fastify({
      logger: true,
      disableRequestLogging: process.env.NODE_ENV === 'production',
    });

    this.kafka = new Kafka({
      clientId: 'trackflow-consumer',
      brokers: [config.kafka.broker],
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
    const consumer = this.kafka.consumer({ groupId: 'trackflow-group' });

    await consumer.connect();
    await consumer.subscribe({ topic: 'trackflow-events', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const endTimer = this.metrics.startTimer();
        
        try {
          const value = message.value?.toString();
          if (!value) {
            throw new Error('Empty message value');
          }

          const event = JSON.parse(value);
          await this.clickhouse.insertEvent(event);
          
          this.metrics.incrementMessageCounter('success');
          endTimer();
        } catch (error) {
          this.server.log.error(`Error processing message:`, error);
          this.metrics.incrementMessageCounter('error');
          this.metrics.incrementErrorCounter('processing_error');
          throw error; // Will trigger the retry mechanism
        }
      },
    });

    // Update queue size metric periodically
    setInterval(async () => {
      try {
        const admin = this.kafka.admin();
        await admin.connect();
        const offsets = await admin.fetchTopicOffsets('trackflow-events');
        const consumerOffsets = await admin.fetchOffsets({
          groupId: 'trackflow-group',
          topics: ['trackflow-events']
        });
        
        const lag = offsets.reduce((total, partition) => {
          const consumerOffset = consumerOffsets.find(
            p => p.partition === partition.partition
          );
          return total + (parseInt(partition.offset) - parseInt(consumerOffset?.offset || '0'));
        }, 0);
        
        this.metrics.setQueueSize(lag);
        await admin.disconnect();
      } catch (error) {
        this.server.log.error('Error updating queue metrics:', error);
      }
    }, 10000); // Update every 10 seconds
  }

  private async setupGracefulShutdown() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      this.server.log.info('Shutting down gracefully...');
      
      try {
        await this.server.close();
        this.server.log.info('Server closed');
        process.exit(0);
      } catch (error) {
        this.server.log.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Start the application
const app = new ConsumerApp();
app.start().catch(console.error);
