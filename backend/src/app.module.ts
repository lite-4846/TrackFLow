import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { TrackingService } from './modules/tracking/tracking.service';
import { TrackingModule } from './modules/tracking/tracking.module';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes env variables available throughout the app
    }),
    AuthModule,
    TrackingModule,
    ProcessingModule,
    UsersModule,
    PrismaModule,
    KafkaModule,
  ],
  controllers: [AppController],
  providers: [AppService, TrackingService],
})
export class AppModule {}
