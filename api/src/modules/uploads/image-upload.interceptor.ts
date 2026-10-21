import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from './uploads.service.js';

// Um arquivo por requisição, no campo "file", até 8 MB (fica abaixo do limite de 10 MB do Caddy).
export const ImageUpload = () =>
  FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 } });
