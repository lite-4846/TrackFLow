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
    const startTime = process.hrtime();
    
    try {
      await this.kafkaProducerService.produce('tracking-events', eventData);
      this.metricsService.recordKafkaEvent('tracking-events');
      return { success: true, message: 'Event received' };
    } catch (error: unknown) {
      const errorName = error instanceof Error ? error.name : 'unknown';
      this.metricsService.recordEventAborted(errorName, 'kafka_event', { topic: 'tracking-events' });
      throw error;
    } finally {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = (seconds * 1e9 + nanoseconds) / 1e6; // Convert to ms
      this.metricsService.recordHttpRequestDuration(
        'POST',
        '/tracking/events',
        200,
        duration / 1000 // Convert to seconds
      );
    }
  }
}
