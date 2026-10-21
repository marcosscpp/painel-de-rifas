import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

@Public()
@Controller('orders')
export class OrdersPublicController {
  constructor(private readonly orders: OrdersService) {}

  // 30 pedidos por minuto por IP: segura robô sem barrar quem compra numa live atrás
  // da mesma operadora (CGNAT divide IP entre muitos celulares).
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  // O id é um UUID aleatório: só quem criou o pedido conhece o link.
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.get(id);
  }
}
