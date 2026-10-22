import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DrawsService } from './draws.service.js';
import { DrawDto } from './dto/draw.dto.js';

@Roles('ADMIN')
@Controller('admin/raffles/:id/draw')
export class DrawsAdminController {
  constructor(private readonly draws: DrawsService) {}

  // Calcula o ganhador sem publicar.
  @Post('preview')
  @HttpCode(200)
  preview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DrawDto) {
    return this.draws.preview(id, dto);
  }

  // Publica o resultado: a rifa vira "Sorteada" e o ganhador aparece no site.
  @Post()
  @HttpCode(200)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DrawDto) {
    return this.draws.confirm(id, dto);
  }
}
