import { Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminBuyersQuery, AdminOrdersQuery } from './dto/admin-orders.dto.js';
import { OrdersAdminService } from './orders.admin.service.js';

@Roles('ADMIN')
@Controller('admin')
export class OrdersAdminController {
  constructor(private readonly admin: OrdersAdminService) {}

  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('orders')
  list(@Query() q: AdminOrdersQuery) {
    return this.admin.list(q);
  }

  // Declarado antes de orders/:id para "export.csv" não cair na rota do id.
  @Get('orders/export.csv')
  async export(@Query() q: AdminOrdersQuery, @Res() res: Response) {
    const csv = await this.admin.exportCsv(q);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pedidos-${stamp}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(csv);
  }

  @Get('orders/:id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.detail(id);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.cancel(id);
  }

  @Post('orders/:id/refunded')
  @HttpCode(200)
  refunded(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.markRefunded(id);
  }

  @Get('buyers')
  buyers(@Query() q: AdminBuyersQuery) {
    return this.admin.buyers(q);
  }

  @Get('buyers/:id')
  buyer(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.buyer(id);
  }
}
