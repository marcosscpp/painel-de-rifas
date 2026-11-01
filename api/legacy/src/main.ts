import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // reconfigurado abaixo com limite de tamanho
  });
  const config = app.get(ConfigService);

  // IP real do cliente atrás do Caddy (rate limit depende disso).
  app.set('trust proxy', config.getOrThrow<number>('TRUST_PROXY'));

  // Corpo pequeno: a API só recebe JSON enxuto; upload de imagem terá limite próprio.
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: false });

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos que não estão no DTO
      forbidNonWhitelisted: true, // e recusa a requisição se vierem
      transform: true,
    }),
  );
  // Fecha conexões com calma no SIGTERM (deploy sem derrubar requisições).
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  Logger.log(`API ouvindo na porta ${port} (${config.get('NODE_ENV')})`, 'Bootstrap');
}
await bootstrap();
