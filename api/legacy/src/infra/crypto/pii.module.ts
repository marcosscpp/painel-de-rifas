import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PiiBackfillService } from './pii-backfill.service.js';
import { PiiCipher } from './pii-cipher.js';

@Global()
@Module({
  providers: [
    {
      provide: PiiCipher,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PiiCipher(config.getOrThrow<string>('PII_KEYS'), config.getOrThrow<string>('PII_INDEX_KEY')),
    },
    PiiBackfillService,
  ],
  exports: [PiiCipher],
})
export class PiiModule {}
