import { Module } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service';

@Module({
  imports: [],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
