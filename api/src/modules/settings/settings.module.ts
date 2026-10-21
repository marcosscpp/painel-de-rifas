import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { SettingsPublicController } from './settings.public.controller.js';

// Configurações: por enquanto só as públicas do checkout. Edição pelo admin entra na etapa 6.
@Module({
  imports: [PaymentsModule],
  controllers: [SettingsPublicController],
})
export class SettingsModule {}
