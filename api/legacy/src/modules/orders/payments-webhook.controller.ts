import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { PAYMENT_PROVIDER, type PaymentGateway } from '../payments/payment-provider.js';
import { OrdersService } from './orders.service.js';

@Public()
@Controller()
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly orders: OrdersService,
    @Inject(PAYMENT_PROVIDER) private readonly gateway: PaymentGateway,
  ) {}

  // Webhook do gateway. Sem rate limit: numa live chegam muitos Pix juntos do mesmo IP do gateway.
  // Sem o token certo, 401. Evento que não interessa ou repetido, 200 (para o gateway não insistir).
  @SkipThrottle()
  @Post('webhooks/:provider')
  @HttpCode(200)
  async webhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    if (provider.toUpperCase() !== this.gateway.name) throw new NotFoundException();
    if (!this.gateway.verifyWebhook(headers)) {
      this.logger.warn('Webhook recusado: token inválido');
      throw new UnauthorizedException();
    }
    const ev = this.gateway.parseWebhook(body);
    if (!ev) return { ok: true, result: 'ignored' };
    const result = await this.orders.handleGatewayEvent(ev);
    return { ok: true, result };
  }

  // Só existe com o gateway falso fora de produção (senão responde 404).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('orders/:id/simulate-payment')
  @HttpCode(200)
  simulate(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.simulatePayment(id);
  }
}
