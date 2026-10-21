import { Module } from '@nestjs/common';
import { RafflesModule } from '../raffles/raffles.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { UsersModule } from '../users/users.module.js';
import { OrdersPublicController } from './orders.public.controller.js';
import { OrdersService } from './orders.service.js';

// Pedidos: reserva de números com SKIP LOCKED, idempotência e expiração em 15 min.
@Module({
  imports: [UsersModule, RafflesModule, UploadsModule],
  controllers: [OrdersPublicController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
