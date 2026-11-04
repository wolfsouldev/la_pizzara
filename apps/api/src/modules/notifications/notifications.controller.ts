import { Controller, Get, Param, Patch, Post, HttpCode, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { notificationListSchema, uuidSchema, type NotificationList } from '@uni/shared';
import { CurrentUser } from '../../common/decorators/auth';
import { ZodPipe } from '../../common/http';
import type { User } from '../../database/schema';
import { NotificationsService } from './notifications.service';
@ApiTags('notifications') @ApiCookieAuth('session') @Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications:NotificationsService) {}
  @Get() list(@CurrentUser() user:User,@Query(new ZodPipe(notificationListSchema)) q:NotificationList) { return this.notifications.list(user,q); }
  @Get('unread-count') unread(@CurrentUser() user:User) { return this.notifications.unread(user); }
  @Patch(':id/read') read(@CurrentUser() user:User,@Param('id',new ZodPipe(uuidSchema)) id:string) { return this.notifications.read(user,id); }
  @Post('read-all') @HttpCode(200) readAll(@CurrentUser() user:User) { return this.notifications.readAll(user); }
}
