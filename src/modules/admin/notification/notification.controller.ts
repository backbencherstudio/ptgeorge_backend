import { Controller, Get, Param, Delete, UseGuards, Req, Patch, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { UpdateNotificationSettingDto } from './dto/update-notification.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';


@ApiTags('Notification-User')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/notification')
export class NotificationController {


  constructor(private readonly notificationService: NotificationService) {}



  // get all notification types
  @ApiOperation({
    summary: 'Get all notification types',
    description: 'Retrieve all available notification types with their labels and descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all notification types',
    schema: {
      example: {
        types: [
          {
            type: 'NEW_REQUEST_ALERT',
            label: 'New Request Alert',
            description: 'Instant notification for new requests',
          },
          {
            type: 'APPROVAL_CONFIRMATION',
            label: 'Approval Confirmation',
            description: 'When member is approved',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @Get('all-notification')
  async getAllNotificationTypes() {
    return this.notificationService.getAllNotificationTypes();
  }


  // get settings notification
  @ApiOperation({
    summary: 'Get user notification settings',
    description: 'Retrieve notification settings for the authenticated user, showing which notification types are enabled or disabled',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user notification settings',
    schema: {
      example: {
        userId: 'user-id-123',
        settings: [
          {
            type: 'NEW_REQUEST_ALERT',
            label: 'New Request Alert',
            description: 'Instant notification for new requests',
            isEnabled: true,
          },
          {
            type: 'APPROVAL_CONFIRMATION',
            label: 'Approval Confirmation',
            description: 'When member is approved',
            isEnabled: false,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User ID not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @Get('settings')
  async getNotificationSettings(
    @Req() req: Request
  ) {
    const userId = req.user.userId;
    return this.notificationService.getNotificationSettings(userId);
  }

  // update notification settings
  @ApiOperation({
    summary: 'Update user notification settings',
    description: 'Enable or disable a specific notification type for the authenticated user',
  })
  @ApiBody({
    type: UpdateNotificationSettingDto,
    description: 'Notification setting to update',
    examples: {
      example1: {
        value: {
          type: 'NEW_REQUEST_ALERT',
          isEnabled: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated notification setting',
    schema: {
      example: {
        message: 'NEW_REQUEST_ALERT enabled successfully',
        setting: {
          type: 'NEW_REQUEST_ALERT',
          label: 'New Request Alert',
          description: 'Instant notification for new requests',
          isEnabled: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User ID not found or invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @Patch('settings')
  async updateNotificationSettings(
    @Req() req: Request,
    @Body() updateDto: UpdateNotificationSettingDto
  ) {
    const userId = req.user.userId;
    return this.notificationService.updateNotificationSettings(userId, updateDto);
  }

  //get all notification types
  


  






  
}
