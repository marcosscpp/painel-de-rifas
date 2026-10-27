import { Module } from '@nestjs/common';
import { DrawsAdminController, LotteryAdminController } from './draws.admin.controller.js';
import { DrawsService } from './draws.service.js';

// Sorteio: resultado da Loteria Federal, regra de apuração e ganhador.
@Module({
  controllers: [DrawsAdminController, LotteryAdminController],
  providers: [DrawsService],
  exports: [DrawsService],
})
export class DrawsModule {}
