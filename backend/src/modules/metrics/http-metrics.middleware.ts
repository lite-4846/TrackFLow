import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();
    const { method, path: route } = req;

    // Skip metrics endpoint
    if (route === '/metrics') {
      return next();
    }

    res.on('finish', () => {
      const duration = this.getDurationInSeconds(start);
      const statusCode = res.statusCode;
      
      // Record the request metrics
      this.metricsService.recordHttpRequest(
        method,
        route,
        statusCode,
        duration
      );
    });

    next();
  }

  private getDurationInSeconds(start: [number, number]): number {
    const NS_PER_SEC = 1e9;
    const diff = process.hrtime(start);
    return (diff[0] * NS_PER_SEC + diff[1]) / 1e9; // Convert to seconds
  }
}
