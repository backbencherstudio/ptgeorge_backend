import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AnnouncementStatus } from 'prisma/generated/enums';

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {
  @ApiProperty({
    enum: AnnouncementStatus,
    description: 'Update announcement status',
    required: false,
    example: AnnouncementStatus.PUBLISHED,
  })
  @IsEnum(AnnouncementStatus)
  @IsOptional()
  status?: AnnouncementStatus;
}
