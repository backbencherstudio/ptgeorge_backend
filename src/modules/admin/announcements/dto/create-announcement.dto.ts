// update-announcement.dto.ts
import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementStatus } from 'prisma/generated/enums';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({
    description: 'Updated title of the announcement.',
    example: 'Platform Maintenance — Rescheduled to Feb 16',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty if provided' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated message body of the announcement.',
    example: 'The maintenance has been rescheduled to Feb 16 from 2–4 AM EST.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty if provided' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Updated status of the announcement.',
    enum: AnnouncementStatus,
    example: AnnouncementStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(AnnouncementStatus, {
    message: `status must be one of: ${Object.values(AnnouncementStatus).join(', ')}`,
  })
  status?: AnnouncementStatus;
}
