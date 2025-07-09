import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'trackflow',
      brokers: ['localhost:9092'],
      logLevel: logLevel.INFO,
      logCreator: () => ({ level, ...rest }) => {
        this.logger.log(`[Kafka] ${JSON.stringify({ level, ...rest })}`);
        return {}; // Return empty object as required by the type
      },
    });
    this.producer = this.kafka.producer();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.producer.on('producer.connect', () => {
      this.isConnected = true;
      this.logger.log('Kafka Producer connected successfully');
    });

    this.producer.on('producer.disconnect', () => {
      this.isConnected = false;
      this.logger.warn('Kafka Producer disconnected');
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      this.logger.error(`Kafka request timeout: ${JSON.stringify(payload)}`);
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Attempting to connect to Kafka...');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async produce(topic: string, message: any) {
    if (!this.isConnected) {
      this.logger.warn('Attempting to produce message while not connected to Kafka');
      try {
        await this.producer.connect();
      } catch (error) {
        this.logger.error('Failed to reconnect to Kafka', error);
        throw error;
      }
    }

    try {
      this.logger.log(`Producing message to topic: ${topic}`, message);
      const result = await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });
      this.logger.debug(`Message produced successfully to topic: ${topic}`);
      return result;
    } catch (error) {
      this.logger.error('Error producing message to Kafka', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka Producer disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka Producer', error);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.producer.connect();
      this.logger.log('Kafka connection check: OK');
      return true;
    } catch (error) {
      this.logger.error('Kafka connection check: FAILED', error);
      return false;
    }
  }

}
