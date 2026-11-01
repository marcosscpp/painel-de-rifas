import { Module } from '@nestjs/common';
import { RafflesModule } from '../raffles/raffles.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { PrizesAdminController } from './prizes.admin.controller.js';
import { PrizesService } from './prizes.service.js';

// Prêmios de cada rifa e a galeria de imagens.
@Module({
  imports: [RafflesModule, UploadsModule],
  controllers: [PrizesAdminController],
  providers: [PrizesService],
})
export class PrizesModule {}
