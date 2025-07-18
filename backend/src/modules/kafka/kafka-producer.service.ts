import { Injectable, OnModuleInit, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { Kafka, Producer, logLevel, KafkaConfig } from 'kafkajs';
import { KafkaUtils, TRACKING_EVENTS_TOPIC } from '@shared/kafka/kafka-utils';
import { MetricsService } from '../metrics/metrics.service';

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
};

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly kafkaConfig: KafkaConfig;
  private readonly retryConfig: typeof DEFAULT_RETRY_CONFIG;
  private isShuttingDown = false;
  constructor(
    private readonly metrics: MetricsService
  ) {
    const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    const brokerList = brokers.split(',').map(b => b.trim());
    console.log("Brokers List", brokerList);
    
    // Configure retry settings from environment or use defaults
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: parseInt(process.env.KAFKA_RETRY_ATTEMPTS || String(DEFAULT_RETRY_CONFIG.maxRetries), 10),
      initialDelay: parseInt(process.env.KAFKA_RETRY_INITIAL_DELAY || String(DEFAULT_RETRY_CONFIG.initialDelay), 10),
      maxDelay: parseInt(process.env.KAFKA_RETRY_MAX_DELAY || String(DEFAULT_RETRY_CONFIG.maxDelay), 10),
    };
    
    this.kafkaConfig = {
      clientId: 'trackflow-backend',
      brokers: brokerList,
      logLevel: logLevel.INFO,
      retry: {
        maxRetryTime: this.retryConfig.maxDelay,
        retries: this.retryConfig.maxRetries,
      },
    };
    
    this.kafka = new Kafka({
      ...this.kafkaConfig,
      logCreator: () => (entry) => {
        const { level, log, ...rest } = entry;
        this.logger.log(`[Kafka] ${JSON.stringify({ level, ...rest })}`);
        return () => {}; // Return empty function as required by the type
      },
    });
    
    this.producer = this.kafka.producer();
    this.setupEventHandlers();
    
    this.logger.log(`Initialized Kafka producer with brokers: ${brokerList.join(', ')}`);
    this.logger.debug(`Retry configuration: ${JSON.stringify(this.retryConfig)}`);
  }

  /**
   * Retry helper with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    overrideConfig: Partial<typeof DEFAULT_RETRY_CONFIG> = {}
  ): Promise<T> {
    const config = { ...this.retryConfig, ...overrideConfig };
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            config.initialDelay * Math.pow(config.factor, attempt - 1),
            config.maxDelay
          );
          
          this.logger.debug(
            `Retry ${attempt}/${config.maxRetries} for ${operationName} in ${delay}ms...`
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt > config.maxRetries) {
          this.logger.error(
            `Max retries (${config.maxRetries}) reached for ${operationName}: ${error.message}`
          );
          break;
        }

        this.logger.warn(
          `Attempt ${attempt}/${config.maxRetries} failed for ${operationName}: ${error.message}`
        );
      }
    }

    throw lastError || new Error(`Unknown error during ${operationName}`);
  }

  private setupEventHandlers() {
    this.producer.on('producer.connect', () => {
      this.isConnected = true;
      this.logger.log('Kafka Producer connected successfully');
    });

    this.producer.on('producer.disconnect', () => {
      this.isConnected = false;
      this.logger.warn('Kafka Producer disconnected');
      this.metrics.recordEventAborted('connection_lost', 'kafka_producer');
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      const error = new Error(`Kafka request timeout: ${JSON.stringify(payload)}`);
      this.metrics.recordEventAborted('request_timeout', 'kafka_producer');
      this.logger.error(error.message);
    });
  }

  async onModuleInit() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitializing) {
      this.logger.debug('Kafka initialization already in progress');
      return;
    }

    this.isInitializing = true;
    this.initializationPromise = this.initializeKafka();
    return this.initializationPromise;
  }

  private async initializeKafka() {
    try {
      await this.withRetry(
        async () => {
          const isBrokerAvailable = await KafkaUtils.validateBrokerConnection(this.kafkaConfig);
          if (!isBrokerAvailable) {
            throw new Error('Failed to validate Kafka broker connection');
          }
          return true;
        },
        'broker validation'
      );

      await this.withRetry(() => this.ensureTopics(), 'topic validation');
      await this.withRetry(() => this.producer.connect(), 'producer connection');

      this.logger.log('Successfully connected to Kafka');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka producer after all retries', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }
  
  /**
   * Ensures all required topics exist with correct configuration
   */
  private async ensureTopics() {
    try {
      this.logger.log('Validating Kafka topics...');
      
      // Ensure tracking-events topic exists with correct configuration
      await KafkaUtils.ensureTopicExists(this.kafkaConfig, {
        ...TRACKING_EVENTS_TOPIC,
        topic: process.env.KAFKA_TOPIC || TRACKING_EVENTS_TOPIC.topic,
      });
      
      this.logger.log('All Kafka topics validated successfully');
    } catch (error) {
      this.logger.error('Error validating Kafka topics', error);
      throw error;
    }
  }

  async produce(topic: string, message: any) {
    const messages = Array.isArray(message) ? message : [message];
    const batchSize = messages.length;
    
    try {
      // Record received events
      this.metrics.recordEventReceived('kafka_produce', { topic });
      
      // Update pending events count
      this.metrics.updatePendingEvents(batchSize, 'kafka_produce');
      
      if (!this.isConnected) {
        this.logger.warn('Attempting to produce message while not connected to Kafka. Initializing connection...');
        try {
          await this.initializeKafka();
        } catch (error) {
          const errorName = error instanceof Error ? error.name : 'unknown';
          this.metrics.recordEventAborted(errorName, 'kafka_produce', { topic });
          this.logger.error('Failed to initialize Kafka connection', error);
          throw error;
        }
      }
      
      // Execute the operation with processing time tracking
      const result = await this.metrics.recordKafkaProcessingTime(
        topic,
        async () => {
          return this.withRetry(
            async () => {
              return this.producer.send({
                topic,
                messages: messages.map(msg => ({
                  value: JSON.stringify(msg)
                })),
              });
            },
            `message production to topic ${topic}`
          );
        }
      );
      
      // Record successful production
      this.metrics.recordEventProduced(topic);
      
      // Update pending events count
      this.metrics.updatePendingEvents(-batchSize, 'kafka_produce');
      
      return result;
      
    } catch (error) {
      // Record aborted events on failure
      this.metrics.recordEventAborted(
        'produce_error', 
        'kafka_produce', 
        { 
          topic,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      
      // Update pending events count on error
      this.metrics.updatePendingEvents(-batchSize, 'kafka_produce');
      
      this.logger.error('Failed to produce message to Kafka', {
        topic,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    try {
      if (this.producer) {
        await this.producer.disconnect();
        this.logger.log('Kafka producer disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer', error);
    } finally {
      this.isConnected = false;
      this.initializationPromise = null;
      this.isInitializing = false;
    }
  }

  async checkConnection(): Promise<boolean> {
    if (this.isShuttingDown) {
      return false;
    }

    try {
      // Check if the broker is reachable with a shorter timeout for health checks
      const isBrokerAvailable = await this.withRetry(
        async () => {
          console.log("config", this.kafkaConfig);
          const result = await KafkaUtils.validateBrokerConnection({
            ...this.kafkaConfig,
            requestTimeout: 5000, // Shorter timeout for health checks
          });
          if (!result) {
            throw new Error('Broker validation returned false');
          }
          return true;
        },
        'health check broker validation',
        {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 1000,
        }
      );

      if (!isBrokerAvailable) {
        this.metrics.recordEventAborted('broker_unavailable', 'kafka_connection');
        return false;
      }

      // Verify producer is connected
      await this.withRetry(
        async () => {
          if (!this.isConnected) {
            await this.producer.connect();
          }
          return true;
        },
        'producer connection check',
        {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 1000,
        }
      );
      
      // Log connection status periodically
      if (Date.now() - (this['lastStatusLog'] || 0) > 30000) { // Log every 30 seconds
        this.logger.log({
          message: 'Kafka connection status',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
        this['lastStatusLog'] = Date.now();
      }
      
      return true;
    } catch (error) {
      this.metrics.recordEventAborted(
        'connection_check_failed', 
        'kafka_connection',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.logger.warn('Kafka connection check failed', error);
      return false;
    }
  }

}
