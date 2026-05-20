import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationSettingType } from 'prisma/generated/client';

export class UpdateNotificationSettingDto {

  @ApiProperty({
    enum: NotificationSettingType,
    example: NotificationSettingType.NEW_REQUEST_ALERT,
    description: 'Which notification type to update',
  })
  @IsEnum(NotificationSettingType)
  type: NotificationSettingType;

  @ApiProperty({ example: true, description: 'true = on, false = off' })
  @IsBoolean()
  isEnabled: boolean;
  
}