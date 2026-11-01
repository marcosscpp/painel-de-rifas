import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Rate limit só para HTTP. O gateway de WebSocket é somente leitura (entrar em salas)
// e tem limites próprios (tamanho de mensagem, salas por conexão).
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  override canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return Promise.resolve(true);
    return super.canActivate(ctx);
  }
}
