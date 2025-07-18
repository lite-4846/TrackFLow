import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { KafkaModule } from '../kafka/kafka.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [KafkaModule, MetricsModule],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
