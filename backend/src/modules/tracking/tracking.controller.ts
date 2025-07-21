import { Body, Controller, Post } from '@nestjs/common';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  @Post('events')
  async trackEvents(@Body() eventData: Record<string, unknown>) {
    try {
      await this.kafkaProducerService.produce('tracking-events', eventData);
      return { success: true, message: 'Event received' };
    } catch (error: unknown) {
      throw error;
    }
  }
}
