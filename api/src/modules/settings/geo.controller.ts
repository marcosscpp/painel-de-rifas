import { Controller, Get, Header, Logger, NotFoundException, Param, ServiceUnavailableException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { normalizeZip } from '../../common/utils/br.js';

type ViaCep = { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean | string };

// Busca de CEP para preencher o endereço no checkout. Passa pela API (e não direto do navegador)
// para não abrir a CSP do site para outro domínio.
@Public()
@Controller('geo')
export class GeoController {
  private readonly logger = new Logger(GeoController.name);

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('cep/:cep')
  @Header('Cache-Control', 'public, max-age=86400')
  async cep(@Param('cep') raw: string) {
    const cep = normalizeZip(raw);
    if (!cep) throw new NotFoundException('CEP não encontrado');

    let data: ViaCep;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(5_000) });
      data = (await res.json()) as ViaCep;
    } catch (e) {
      this.logger.warn(`ViaCEP indisponível: ${String(e)}`);
      throw new ServiceUnavailableException('Busca de CEP indisponível. Preencha o endereço manualmente.');
    }
    if (data.erro) throw new NotFoundException('CEP não encontrado');
    return {
      zipCode: cep,
      street: data.logradouro ?? '',
      district: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  }
}
