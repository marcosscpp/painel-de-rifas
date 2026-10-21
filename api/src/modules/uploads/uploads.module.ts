import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service.js';

// Upload de imagens: valida o conteúdo, converte para WebP e grava no MinIO.
@Module({
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
