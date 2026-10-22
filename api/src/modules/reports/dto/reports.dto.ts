import { IsEnum, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/client.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const REPORT_TYPES = ['sales-by-raffle', 'sales-by-day', 'orders', 'buyers', 'numbers'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// Filtros comuns a todos os relatórios. Datas são dias no horário de Brasília (AAAA-MM-DD, "até" inclusivo).
export class ReportQuery {
  @IsOptional()
  @Matches(DAY, { message: 'from deve estar no formato AAAA-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DAY, { message: 'to deve estar no formato AAAA-MM-DD' })
  to?: string;

  @IsOptional()
  @IsUUID()
  raffleId?: string;

  // Só o relatório de pedidos usa; os demais consideram apenas pedidos pagos.
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class ReportExportQuery extends ReportQuery {
  @IsIn(['csv', 'xlsx'])
  format!: 'csv' | 'xlsx';
}
