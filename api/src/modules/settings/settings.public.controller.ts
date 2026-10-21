import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator.js';
import { PAYMENT_PROVIDER, type PaymentGateway } from '../payments/payment-provider.js';

// O que o site precisa saber antes do checkout (sem nada sensível).
@Public()
@Controller('settings')
export class SettingsPublicController {
  constructor(
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly gateway: PaymentGateway,
  ) {}

  @Get('public')
  @Header('Cache-Control', 'public, max-age=60')
  get() {
    return {
      cpfRequired: this.gateway.requiresCpf,
      pixFeeCents: this.config.getOrThrow<number>('PIX_FEE_CENTS'),
      reservationMinutes: this.config.getOrThrow<number>('RESERVATION_MINUTES'),
    };
  }
}
