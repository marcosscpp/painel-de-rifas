import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ReportExportQuery, ReportQuery } from './dto/reports.dto.js';
import { writeCsv, writeXlsx } from './report-writers.js';
import { ReportsService } from './reports.service.js';

const CONTENT_TYPE = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@Roles('ADMIN')
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  catalog() {
    return this.reports.catalog();
  }

  // Declarado antes de :type para "export" não ser lido como filtro.
  @Get(':type/export')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // exportação pesa no banco
  async export(@Param('type') type: string, @Query() q: ReportExportQuery, @Res() res: Response) {
    const { format, ...filters } = q;
    const { title, columns } = this.reports.definition(type, filters); // erro de filtro vira 4xx antes do download
    const stamp = new Date().toISOString().slice(0, 10);
    const slug = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
    res.setHeader('Content-Type', CONTENT_TYPE[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-${stamp}.${format}"`);
    res.setHeader('Cache-Control', 'no-store');

    const rows = this.reports.rows(type, filters);
    try {
      if (format === 'csv') await writeCsv(res, columns, rows);
      else await writeXlsx(res, title, columns, rows);
    } catch (err) {
      // Cabeçalhos já foram: só resta cortar a conexão para o navegador marcar o download como falho.
      res.destroy(err as Error);
    } finally {
      await rows.return(undefined); // cliente fechou no meio: libera o cursor e a conexão
    }
  }

  @Get(':type')
  @Header('Cache-Control', 'no-store')
  preview(@Param('type') type: string, @Query() q: ReportQuery) {
    return this.reports.preview(type, q);
  }
}
