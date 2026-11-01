import { Module } from '@nestjs/common';
import { BuyerDataReader } from './buyer-data.reader.js';
import { ReportsController } from './reports.controller.js';
import { ReportsDatabase } from './reports.database.js';
import { ReportsService } from './reports.service.js';

// Relatórios do painel: prévia na tela e exportação CSV/XLSX em streaming direto do banco.
@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsDatabase, BuyerDataReader],
})
export class ReportsModule {}
