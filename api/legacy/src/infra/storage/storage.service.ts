import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Fala S3: hoje MinIO no VPS, amanhã S3/R2 trocando só as variáveis.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.publicUrl = config.getOrThrow<string>('S3_PUBLIC_URL').replace(/\/$/, '');
    this.s3 = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Cada upload gera chave nova (uuid), então o arquivo nunca muda: cache eterno.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  // Melhor esforço: um arquivo órfão no bucket não pode derrubar a operação do admin.
  async delete(keys: string[]) {
    if (!keys.length) return;
    try {
      await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    } catch (err) {
      this.logger.warn(`Falha ao apagar ${keys.length} arquivo(s): ${String(err)}`);
    }
  }

  url(key: string) {
    return `${this.publicUrl}/${key}`;
  }
}
