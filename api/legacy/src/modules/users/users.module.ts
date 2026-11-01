import { Module } from '@nestjs/common';
import { BuyerSessionService } from './buyer-session.service.js';
import { BuyerController } from './buyer.controller.js';
import { UsersService } from './users.service.js';

// Compradores: cadastro do checkout, sessão sem senha ("Comprando como...") e busca por celular + CPF.
@Module({
  controllers: [BuyerController],
  providers: [UsersService, BuyerSessionService],
  exports: [UsersService, BuyerSessionService],
})
export class UsersModule {}
