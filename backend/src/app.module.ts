import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
// import { AuthModule } from './modules/auth/auth.module';
import { ProcessingModule } from './modules/processing/processing.module';
// import { UsersModule } from './modules/users/users.module';
// import { PrismaModule } from './modules/prisma/prisma.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { KafkaModule } from './modules/kafka/kafka.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HttpMetricsMiddleware } from './common/middleware/http-metrics.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes env variables available throughout the app
      envFilePath: ['.env.local', '.env']
    }),
    MetricsModule,
    // AuthModule,
    TrackingModule,
    ProcessingModule,
    // UsersModule,
    // PrismaModule,
    KafkaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP metrics middleware to all routes except /metrics
    consumer
      .apply(HttpMetricsMiddleware)
      .exclude('metrics')
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
