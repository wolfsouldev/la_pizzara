import { ServicesModule } from './modules/services/services.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TaskLinksModule } from './modules/task-links/task-links.module';
import { BoardsModule } from './modules/boards/boards.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AdministrationModule } from './modules/administration/administration.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { env } from './config/environment';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { SessionGuard } from './common/guards/session.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AccessController } from './modules/access/access.controller';
@Module({
  imports: [ServicesModule, ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, HealthModule, AuthModule, NotificationsModule, AdministrationModule, TicketsModule, BoardsModule, TaskLinksModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
      // Local UI work must not hit rate limits; production and LDAP keep them.
      skipIf: () => env.NODE_ENV === 'development' && env.AUTH_PROVIDER === 'local'
        && ['127.0.0.1', '::1'].includes(env.APP_HOST),
    })],
  controllers: [AccessController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: SessionGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
