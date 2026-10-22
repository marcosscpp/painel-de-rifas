import { Module } from '@nestjs/common';
import { DrawsAdminController } from './draws.admin.controller.js';
import { DrawsService } from './draws.service.js';

// Sorteio: resultado da Loteria Federal, regra de apuração e ganhador.
@Module({
  controllers: [DrawsAdminController],
  providers: [DrawsService],
  exports: [DrawsService],
})
export class DrawsModule {}
