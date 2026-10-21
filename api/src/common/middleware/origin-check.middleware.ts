import { ForbiddenException, Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Defesa contra CSRF além do cookie SameSite=Strict: requisições que alteram
// dados vindas de navegador precisam ter Origin na lista permitida.
// Webhooks (servidor → servidor, sem Origin) seguem com token próprio.
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowed: Set<string>;

  constructor(config: ConfigService) {
    this.allowed = new Set(
      config.getOrThrow<string>('CORS_ORIGINS').split(',').map((o) => o.trim()),
    );
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const origin = req.headers.origin;
    if (!SAFE_METHODS.has(req.method) && origin && !this.allowed.has(origin)) {
      throw new ForbiddenException('Origem não permitida');
    }
    next();
  }
}
