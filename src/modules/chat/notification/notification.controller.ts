import { Controller, Get, UseGuards, Req, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { Request } from 'express';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
@UseGuards(JwtAuthGuard) // Ensures that only authenticated users can access these endpoints
export class NotificationController {

  constructor(private readonly notificationService: NotificationService) {}

  // // Get all notifications for the authenticated user
  // @Get('user-notification')
  // @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Notifications retrieved successfully',
  // })
  // @ApiResponse({ status: 401, description: 'Unauthorized' })
  // async getAllUserNotifications(@Req() req: Request) {
  //   const userId = req.user.userId; 
  //   return this.notificationService.findAllNotificationsForUser(userId);
  // }

  // // delete notification by id for the authenticated user
  // @Patch('delete-notification/:id')
  // @ApiOperation({ summary: 'Soft-delete a notification by ID' })
  // @ApiParam({ name: 'id', description: 'Notification ID to delete' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Notification deleted successfully',
  // })
  // @ApiResponse({ status: 401, description: 'Unauthorized' })
  // async deleteUserNotification(
  //   @Req() req: Request, 
  //   @Param('id') id: string) {
  //   const userId = req.user.userId; 
  //   return this.notificationService.deleteNotificationForUser(id, userId);
  // }
}








