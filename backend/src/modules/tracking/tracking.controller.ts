import { Body, Controller, Post } from '@nestjs/common';

@Controller('tracking')
export class TrackingController {

  @Post('events')
  trackEvents(@Body() eventData: any) {
    console.log('Received events from frontend', eventData);
    return { success: true, message: 'Event received' };
  }
}
