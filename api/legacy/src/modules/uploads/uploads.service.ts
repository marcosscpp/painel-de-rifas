import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from '../../infra/storage/storage.service.js';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_WIDTHS = [400, 1200] as const;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);
// Recusa "bombas" de descompressão (imagem pequena em bytes e gigante em pixels).
const MAX_PIXELS = 40_000_000;

export type UploadedImage = { buffer: Buffer; mimetype: string; size: number };

export type ImageUrls = { thumb: string; full: string };

@Injectable()
export class UploadsService {
  constructor(private readonly storage: StorageService) {}

  // Valida pelo conteúdo (não confia na extensão nem no mimetype enviado), corrige a rotação,
  // remove metadados (GPS da foto) e grava versões WebP. Retorna o prefixo da imagem.
  async saveImage(file: UploadedImage | undefined, folder: string): Promise<string> {
    if (!file?.buffer?.length) throw new BadRequestException('Envie uma imagem');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato aceito: JPG, PNG, WebP ou AVIF');
    }

    let format: string | undefined;
    try {
      ({ format } = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS }).metadata());
    } catch {
      throw new BadRequestException('Arquivo não é uma imagem válida');
    }
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw new BadRequestException('Formato aceito: JPG, PNG, WebP ou AVIF');
    }

    const prefix = `${folder}/${randomUUID()}`;
    await Promise.all(
      IMAGE_WIDTHS.map(async (width) => {
        const out = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await this.storage.put(`${prefix}-${width}.webp`, out, 'image/webp');
      }),
    );
    return prefix;
  }

  async deleteImages(prefixes: Array<string | null | undefined>) {
    const keys = prefixes
      .filter((p): p is string => !!p)
      .flatMap((p) => IMAGE_WIDTHS.map((w) => `${p}-${w}.webp`));
    await this.storage.delete(keys);
  }

  urls(prefix: string): ImageUrls;
  urls(prefix: string | null): ImageUrls | null;
  urls(prefix: string | null): ImageUrls | null {
    if (!prefix) return null;
    return {
      thumb: this.storage.url(`${prefix}-400.webp`),
      full: this.storage.url(`${prefix}-1200.webp`),
    };
  }
}
