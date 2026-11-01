import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { UploadsService } from './uploads.service.js';

describe('UploadsService', () => {
  let storage: { put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; url: (k: string) => string };
  let service: UploadsService;

  beforeEach(() => {
    storage = { put: vi.fn(), delete: vi.fn(), url: (k) => `https://img/${k}` };
    service = new UploadsService(storage as never);
  });

  const png = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: '#0a7' } }).png().toBuffer();

  it('converte para duas versões WebP sem aumentar imagem pequena', async () => {
    const buffer = await png(800, 600);
    const prefix = await service.saveImage({ buffer, mimetype: 'image/png', size: buffer.length }, 'raffles/r1');

    expect(prefix).toMatch(/^raffles\/r1\/[0-9a-f-]{36}$/);
    expect(storage.put).toHaveBeenCalledTimes(2);
    const byKey = Object.fromEntries(storage.put.mock.calls.map(([k, b, t]) => [k, { b, t }]));
    const thumb = await sharp(byKey[`${prefix}-400.webp`].b).metadata();
    const full = await sharp(byKey[`${prefix}-1200.webp`].b).metadata();
    expect(thumb).toMatchObject({ format: 'webp', width: 400 });
    expect(full).toMatchObject({ format: 'webp', width: 800 }); // não estica além do original
    expect(byKey[`${prefix}-400.webp`].t).toBe('image/webp');
  });

  it('remove metadados da foto (ex.: localização GPS)', async () => {
    const buffer = await sharp(await png(500, 500))
      .withMetadata({ exif: { IFD0: { Copyright: 'segredo' } } })
      .jpeg()
      .toBuffer();
    await service.saveImage({ buffer, mimetype: 'image/jpeg', size: buffer.length }, 'x');
    const out = await sharp(storage.put.mock.calls[0][1] as Buffer).metadata();
    expect(out.exif).toBeUndefined();
  });

  it('recusa sem arquivo, tipo não aceito e arquivo que não é imagem', async () => {
    await expect(service.saveImage(undefined, 'x')).rejects.toThrow('Envie uma imagem');
    await expect(
      service.saveImage({ buffer: Buffer.from('GIF89a'), mimetype: 'image/gif', size: 6 }, 'x'),
    ).rejects.toBeInstanceOf(BadRequestException);
    // extensão/mimetype mentindo: o conteúdo é texto
    await expect(
      service.saveImage({ buffer: Buffer.from('<script>alert(1)</script>'), mimetype: 'image/png', size: 25 }, 'x'),
    ).rejects.toThrow('não é uma imagem válida');
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('recusa formato real fora da lista mesmo com mimetype aceito', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer();
    await expect(service.saveImage({ buffer: gif, mimetype: 'image/png', size: gif.length }, 'x')).rejects.toThrow(
      'Formato aceito',
    );
  });

  it('apaga as duas versões e ignora prefixos vazios', async () => {
    await service.deleteImages(['a', null, undefined, 'b']);
    expect(storage.delete).toHaveBeenCalledWith(['a-400.webp', 'a-1200.webp', 'b-400.webp', 'b-1200.webp']);
  });

  it('monta as URLs públicas', () => {
    expect(service.urls('a')).toEqual({ thumb: 'https://img/a-400.webp', full: 'https://img/a-1200.webp' });
    expect(service.urls(null)).toBeNull();
  });
});
