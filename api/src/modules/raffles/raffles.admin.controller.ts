import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ImageUpload } from '../uploads/image-upload.interceptor.js';
import type { UploadedImage } from '../uploads/uploads.service.js';
import {
  CreateRaffleDto,
  ListRafflesQuery,
  SetPackagesDto,
  UpdateRaffleDto,
} from './dto/raffle.dto.js';
import { RafflesPresenter } from './raffles.presenter.js';
import { RafflesService } from './raffles.service.js';

@Roles('ADMIN')
@Controller('admin/raffles')
export class RafflesAdminController {
  constructor(
    private readonly raffles: RafflesService,
    private readonly present: RafflesPresenter,
  ) {}

  @Get()
  async list(@Query() q: ListRafflesQuery) {
    const page = await this.raffles.list(q);
    return { ...page, items: page.items.map((r) => this.present.adminListItem(r)) };
  }

  @Post()
  async create(@Body() dto: CreateRaffleDto) {
    return this.present.admin(await this.raffles.create(dto));
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.raffles.get(id));
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRaffleDto) {
    return this.present.admin(await this.raffles.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.raffles.remove(id);
  }

  @Put(':id/packages')
  async setPackages(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPackagesDto) {
    return this.present.admin(await this.raffles.setPackages(id, dto));
  }

  @Post(':id/cover')
  @UseInterceptors(ImageUpload())
  async setCover(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: UploadedImage) {
    return this.present.admin(await this.raffles.setCover(id, file));
  }

  @Post(':id/publish')
  @HttpCode(200)
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.raffles.transition(id, 'publish'));
  }

  @Post(':id/pause')
  @HttpCode(200)
  async pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.raffles.transition(id, 'pause'));
  }

  @Post(':id/resume')
  @HttpCode(200)
  async resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.raffles.transition(id, 'resume'));
  }

  @Post(':id/close')
  @HttpCode(200)
  async close(@Param('id', ParseUUIDPipe) id: string) {
    return this.present.admin(await this.raffles.transition(id, 'close'));
  }
}
