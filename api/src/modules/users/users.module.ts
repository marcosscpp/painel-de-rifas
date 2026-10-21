import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';

// Compradores e admins: cadastro, busca por telefone/CPF.
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
