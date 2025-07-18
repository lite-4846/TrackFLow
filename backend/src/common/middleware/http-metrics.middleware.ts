import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../modules/metrics/metrics.service';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  private readonly metricsService: MetricsService;

  constructor() {
    // Use the singleton instance of MetricsService
    this.metricsService = MetricsService.getInstance();
  }

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();
    const { method, originalUrl } = req;

    // Skip metrics endpoint
    if (originalUrl === '/metrics') {
      return next();
    }

    // Record response finish
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = (seconds * 1e9 + nanoseconds) / 1e6; // Convert to milliseconds
      
      // Record the request metrics
      this.metricsService.recordHttpRequest(method, originalUrl, res.statusCode);
      this.metricsService.recordHttpRequestDuration(
        method,
        originalUrl,
        res.statusCode,
        duration / 1000 // Convert to seconds for Prometheus
      );
    });

    next();
  }
}
