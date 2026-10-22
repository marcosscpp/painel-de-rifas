import { Global, Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { GeoController } from './geo.controller.js';
import { SettingsPublicController } from './settings.public.controller.js';
import { SettingsService } from './settings.service.js';

// Configurações do site editáveis pelo admin (taxa, reserva, idade mínima, links) e busca de CEP.
@Global()
@Module({
  imports: [PaymentsModule],
  controllers: [SettingsPublicController, GeoController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
