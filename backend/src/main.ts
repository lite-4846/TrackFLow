// This must be at the very top of the file, before any other imports
if (process.env.NODE_ENV === 'production') {
  require('module-alias/register');
  require('tsconfig-paths/register');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors({
    origin: ['*'],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
  const port = process.env.PORT || 8000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`🚀 Server running on http://${host}:${port}`);
}
bootstrap().catch((err) => console.warn(err));
