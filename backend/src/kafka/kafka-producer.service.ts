import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'trackflow',
      brokers: ['localhost:9092'],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async produce(topic: string, message: any) {
    try {
      const result = await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });
      return result;
    } catch (error) {
      console.error('Error producing message to Kafka', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

}
