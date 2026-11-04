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
  imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, HealthModule, AuthModule, NotificationsModule, AdministrationModule, TicketsModule, BoardsModule, TaskLinksModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [AccessController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: SessionGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
