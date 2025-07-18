import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class HttpMetricsMiddleware implements OnModuleInit {
  constructor() {}

  onModuleInit() {
    // HTTP metrics are handled by @willsoto/nestjs-prometheus when enabled in PrometheusModule.forRoot()
  }

  // use(req: FastifyRequest, res: FastifyReply, next: () => void) {
  //   // Skip metrics endpoint
  //   if (req.url === '/metrics') {
  //     return next();
  //   }

  //   // HTTP metrics are automatically collected by @willsoto/nestjs-prometheus
  //   // No need for manual collection
  //   next();
  // }

}
