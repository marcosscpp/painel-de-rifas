import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { RafflesModule } from '../raffles/raffles.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { UsersModule } from '../users/users.module.js';
import { OrdersAdminController } from './orders.admin.controller.js';
import { OrdersAdminService } from './orders.admin.service.js';
import { OrdersPublicController } from './orders.public.controller.js';
import { OrdersService } from './orders.service.js';
import { PaymentsWebhookController } from './payments-webhook.controller.js';

// Pedidos: reserva com SKIP LOCKED, idempotência, cobrança Pix, confirmação por webhook e expiração.
@Module({
  imports: [UsersModule, RafflesModule, UploadsModule, PaymentsModule],
  controllers: [OrdersPublicController, PaymentsWebhookController, OrdersAdminController],
  providers: [OrdersService, OrdersAdminService],
  exports: [OrdersService],
})
export class OrdersModule {}
