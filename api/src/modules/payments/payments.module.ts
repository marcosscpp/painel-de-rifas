import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, type PaymentGateway } from './payment-provider.js';
import { AsaasGateway } from './providers/asaas.provider.js';
import { FakeGateway } from './providers/fake.provider.js';

// Pix: escolhe o gateway pela variável PAYMENT_PROVIDER. O resto do sistema só conhece a interface.
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PaymentGateway => {
        const name = config.getOrThrow<string>('PAYMENT_PROVIDER');
        const token = config.get<string>('PAYMENT_WEBHOOK_TOKEN') ?? '';
        if (name === 'FAKE') return new FakeGateway(token || 'fake-dev-token');
        if (name === 'ASAAS') {
          return new AsaasGateway(
            config.getOrThrow<string>('PAYMENT_API_KEY'),
            token,
            config.get<string>('PAYMENT_BASE_URL') || undefined,
          );
        }
        throw new Error(`Gateway ${name} ainda não implementado`);
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
