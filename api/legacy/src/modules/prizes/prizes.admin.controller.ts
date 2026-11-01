import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RafflesPresenter } from '../raffles/raffles.presenter.js';
import { ImageUpload } from '../uploads/image-upload.interceptor.js';
import type { UploadedImage } from '../uploads/uploads.service.js';
import { CreatePrizeDto, UpdatePrizeDto } from './dto/prize.dto.js';
import { PrizesService } from './prizes.service.js';

@Roles('ADMIN')
@Controller('admin')
export class PrizesAdminController {
  constructor(
    private readonly prizes: PrizesService,
    private readonly present: RafflesPresenter,
  ) {}

  @Post('raffles/:raffleId/prizes')
  async create(@Param('raffleId', ParseUUIDPipe) raffleId: string, @Body() dto: CreatePrizeDto) {
    return this.present.admin(await this.prizes.create(raffleId, dto));
  }

  @Patch('prizes/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePrizeDto) {
    return this.present.admin(await this.prizes.update(id, dto));
  }

  @Delete('prizes/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.prizes.remove(id));
  }

  @Post('prizes/:id/images')
  @UseInterceptors(ImageUpload())
  async addImage(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: UploadedImage) {
    return this.present.admin(await this.prizes.addImage(id, file));
  }

  @Delete('prize-images/:id')
  async removeImage(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.prizes.removeImage(id));
  }
}
