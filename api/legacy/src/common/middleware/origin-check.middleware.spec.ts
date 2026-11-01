import { ForbiddenException } from '@nestjs/common';
import { makeConfig } from '../../../test/helpers/mocks.js';
import { OriginCheckMiddleware } from './origin-check.middleware.js';

describe('OriginCheckMiddleware', () => {
  const mw = new OriginCheckMiddleware(makeConfig({ CORS_ORIGINS: 'https://rifas.com.br, https://www.rifas.com.br' }) as never);
  const run = (method: string, origin?: string) => {
    const next = vi.fn();
    mw.use({ method, headers: origin ? { origin } : {} } as never, {} as never, next);
    return next;
  };

  it('libera leitura de qualquer origem', () => {
    expect(run('GET', 'https://evil.com')).toHaveBeenCalled();
  });

  it('libera escrita das origens permitidas (inclusive com espaço na lista)', () => {
    expect(run('POST', 'https://rifas.com.br')).toHaveBeenCalled();
    expect(run('DELETE', 'https://www.rifas.com.br')).toHaveBeenCalled();
  });

  it('bloqueia escrita de outra origem', () => {
    expect(() => run('POST', 'https://evil.com')).toThrow(ForbiddenException);
  });

  it('servidor → servidor (webhook, sem Origin) passa para o token próprio validar', () => {
    expect(run('POST')).toHaveBeenCalled();
  });
});
