import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementAudience, AnnouncementStatus } from 'prisma/generated/enums';

export class AnnouncementQueryDto {
  @ApiPropertyOptional({
    enum: AnnouncementStatus,
    description: 'Filter by publication status',
    example: AnnouncementStatus.PUBLISHED,
  })
  @IsEnum(AnnouncementStatus)
  @IsOptional()
  status?: AnnouncementStatus;

  @ApiPropertyOptional({
    enum: AnnouncementAudience,
    description: 'Filter by target audience type',
    example: AnnouncementAudience.ALL_USERS,
  })
  @IsEnum(AnnouncementAudience)
  @IsOptional()
  audience?: AnnouncementAudience;

  @ApiPropertyOptional({
    description:
      'Filter by church ID - shows announcements targeting this specific church',
    example: 'd637e85c-d8eb-4fd8-b75d-dba41078de30',
  })
  @IsUUID()
  @IsOptional()
  church_id?: string;

  @ApiPropertyOptional({
    description:
      'Filter by creator user ID - shows announcements created by a specific admin',
    example: 'user-123-456',
  })
  @IsUUID()
  @IsOptional()
  created_by_id?: string;

  @ApiPropertyOptional({
    description: 'Search by title or message content (case-insensitive)',
    example: 'maintenance',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Show announcements starting on or after this date (ISO format)',
    example: '2025-02-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  start_date_from?: string;

  @ApiPropertyOptional({
    description:
      'Show announcements starting on or before this date (ISO format)',
    example: '2025-02-28T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  start_date_to?: string;

  @ApiPropertyOptional({
    description:
      'Show only currently active announcements (published AND within date range)',
    example: true,
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  active_only?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
