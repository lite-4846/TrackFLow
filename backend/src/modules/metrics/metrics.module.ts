import { Logger, Module, Inject, OnModuleDestroy } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
      // Custom metrics will be registered in MetricsService
    }),
  ],
  providers: [
    {
      provide: 'METRICS_SERVICE',
      useFactory: (): MetricsService => {
        try {
          return MetricsService.getInstance();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          Logger.error(`Failed to initialize MetricsService: ${errorMessage}`, 'MetricsModule');
          throw new Error(`MetricsService initialization failed: ${errorMessage}`);
        }
      },
    },
    {
      provide: MetricsService,
      useExisting: 'METRICS_SERVICE',
    },
  ],
  exports: [MetricsService, PrometheusModule],
})
export class MetricsModule implements OnModuleDestroy {
  private readonly logger = new Logger(MetricsModule.name);

  constructor(
    @Inject('METRICS_SERVICE')
    private readonly metricsService: MetricsService
  ) {}

  onModuleDestroy(): void {
    try {
      const service = this.metricsService as { onModuleDestroy?: () => Promise<void> | void };
      if (service?.onModuleDestroy && typeof service.onModuleDestroy === 'function') {
        const result = service.onModuleDestroy();
        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Async error during metrics service cleanup: ${errorMessage}`);
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error during metrics service cleanup: ${errorMessage}`);
    }
  }
}
