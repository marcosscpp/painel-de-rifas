import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { RafflesPresenter } from './raffles.presenter.js';
import { RafflesService } from './raffles.service.js';

@Public()
@Controller('raffles')
export class RafflesPublicController {
  constructor(
    private readonly raffles: RafflesService,
    private readonly present: RafflesPresenter,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=5')
  async list() {
    const items = await this.raffles.listPublic();
    return items.map((r) => this.present.publicListItem(r));
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=5')
  async get(@Param('slug') slug: string) {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new NotFoundException('Rifa não encontrada');
    return this.present.publicDetail(await this.raffles.getPublic(slug));
  }
}
