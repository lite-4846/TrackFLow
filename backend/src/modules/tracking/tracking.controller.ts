import { Body, Controller, Post } from '@nestjs/common';
import { KafkaProducerService } from 'src/kafka/kafka-producer.service';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  @Post('events')
  trackEvents(@Body() eventData: any) {
    console.log('Received events from frontend', eventData);
    this.kafkaProducerService
      .produce('tracking-events', eventData)
      .then((res) => {
        console.log('Produced event to Kafka', res);
      })
      .catch((err) => {
        console.log(err);
      });
    return { success: true, message: 'Event received' };
  }
}
