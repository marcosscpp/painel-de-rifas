import { Body, Controller, Get, Header, Inject, Put } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PAYMENT_PROVIDER, type PaymentGateway } from '../payments/payment-provider.js';
import { UpdateSettingsDto } from './dto/settings.dto.js';
import { SettingsService } from './settings.service.js';

@Controller()
export class SettingsPublicController {
  constructor(
    private readonly settings: SettingsService,
    @Inject(PAYMENT_PROVIDER) private readonly gateway: PaymentGateway,
  ) {}

  // O que o site precisa saber antes do checkout (sem nada sensível).
  @Public()
  @Get('settings/public')
  @Header('Cache-Control', 'public, max-age=30')
  async getPublic() {
    const s = await this.settings.get();
    return { ...s, cpfRequired: true, gateway: this.gateway.name };
  }

  @Roles('ADMIN')
  @Get('admin/settings')
  get() {
    return this.settings.get();
  }

  @Roles('ADMIN')
  @Put('admin/settings')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
