import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { BuyerSessionService } from '../users/buyer-session.service.js';
import { requireBuyer } from '../users/buyer.controller.js';
import { UsersService } from '../users/users.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

@Public()
@Controller()
export class OrdersPublicController {
  constructor(
    private readonly orders: OrdersService,
    private readonly users: UsersService,
    private readonly session: BuyerSessionService,
  ) {}

  // 30 pedidos por minuto por IP: segura robô sem barrar quem compra numa live atrás
  // da mesma operadora (CGNAT divide IP entre muitos celulares).
  // Com dados no corpo: cadastra/atualiza o comprador e passa a lembrar dele neste navegador.
  // Sem dados: compra como o comprador da sessão ("Comprando como...").
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('orders')
  @HttpCode(201)
  async create(@Body() dto: CreateOrderDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    let buyer;
    if (dto.buyer) {
      buyer = await this.users.upsertBuyer(dto.buyer);
    } else {
      buyer = await this.session.read(req);
      if (!buyer) throw new BadRequestException('Informe seus dados para continuar');
    }
    const order = await this.orders.create(dto, buyer.id);
    if (dto.buyer) await this.session.issue(res, buyer);
    return order;
  }

  // O id é um UUID aleatório: só quem criou o pedido conhece o link.
  @Get('orders/:id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.get(id);
  }

  // "Meus números": compras do comprador identificado neste navegador.
  @Get('buyer/orders')
  @Header('Cache-Control', 'no-store')
  async mine(@Req() req: Request) {
    const buyer = await requireBuyer(this.session, req);
    return { buyer: this.session.publicProfile(buyer), orders: await this.orders.listForBuyer(buyer.id) };
  }
}
