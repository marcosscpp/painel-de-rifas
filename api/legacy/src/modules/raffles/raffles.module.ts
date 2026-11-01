import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module.js';
import { RafflesAdminController } from './raffles.admin.controller.js';
import { RafflesPresenter } from './raffles.presenter.js';
import { RafflesPublicController } from './raffles.public.controller.js';
import { RafflesService } from './raffles.service.js';

// Rifas: CRUD do admin, listagem pública, geração dos números ao publicar.
@Module({
  imports: [UploadsModule],
  controllers: [RafflesAdminController, RafflesPublicController],
  providers: [RafflesService, RafflesPresenter],
  exports: [RafflesService, RafflesPresenter],
})
export class RafflesModule {}
