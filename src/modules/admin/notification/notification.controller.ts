import { Controller, Get, Param, Delete, UseGuards, Req, Patch, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { UpdateNotificationSettingDto } from './dto/update-notification.dto';


@ApiBearerAuth()
@ApiTags('Notification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/notification')
export class NotificationController {

  constructor(private readonly notificationService: NotificationService) {}

  // get settings notification
  @Get('settings')
  async getNotificationSettings(
    @Req() req: Request
  ) {
    const userId = req.user.userId;
    return this.notificationService.getNotificationSettings(userId);
  }

  // update notification settings
  @Patch('settings')
  async updateNotificationSettings(
    @Req() req: Request,
    @Body() updateDto: UpdateNotificationSettingDto
  ) {
    const userId = req.user.userId;
    return this.notificationService.updateNotificationSettings(userId, updateDto);
  }


  






  
}
