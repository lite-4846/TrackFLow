import { Controller, Get } from '@nestjs/common';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Controller('health')
export class HealthController {
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  @Get('kafka')
  async checkKafka() {
    const isConnected = await this.kafkaProducer.checkConnection();
    return {
      service: 'kafka-producer',
      status: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
