import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware.js';
import { validateEnv } from './config/env.validation.js';
import { PiiModule } from './infra/crypto/pii.module.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { StorageModule } from './infra/storage/storage.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DrawsModule } from './modules/draws/draws.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { PrizesModule } from './modules/prizes/prizes.module.js';
import { RafflesModule } from './modules/raffles/raffles.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    // Limite padrão por IP; rotas sensíveis (login, pedido) apertam com @Throttle.
    // Memória local basta com uma instância; com várias, trocar o storage por Redis.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    PiiModule,
    StorageModule,

    HealthModule,
    AuthModule,
    UsersModule,
    RafflesModule,
    PrizesModule,
    OrdersModule,
    PaymentsModule,
    RealtimeModule,
    DrawsModule,
    SettingsModule,
    UploadsModule,
    ReportsModule,
  ],
  providers: [
    // Ordem importa: rate limit → autenticação → papel. Os três valem só para HTTP.
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginCheckMiddleware).forRoutes('*path');
  }
}
