import { Body, Controller, Post } from '@nestjs/common';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { MetricsService } from '../metrics/metrics.service';

@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly metricsService: MetricsService,
  ) {}

  @Post('events')
  async trackEvents(@Body() eventData: Record<string, unknown>) {
    const timer = this.metricsService.startEventProcessingTimer('track_events');
    
    try {
      await this.kafkaProducerService.produce('tracking-events', eventData);
      this.metricsService.recordKafkaMessage('tracking-events');
      return { success: true, message: 'Event received' };
    } catch (error: unknown) {
      const errorName = error instanceof Error ? error.name : 'unknown';
      this.metricsService.recordKafkaError('tracking-events', errorName);
      throw error;
    } finally {
      timer();
    }
  }
}
