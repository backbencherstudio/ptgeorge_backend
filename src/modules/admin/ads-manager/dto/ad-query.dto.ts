import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { AdStatus, AdPlacement } from 'prisma/generated/enums';
import { Type } from 'class-transformer';

export class AdQueryDto {
  @ApiPropertyOptional({ enum: AdStatus, description: 'Filter by status' })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;

  @ApiPropertyOptional({
    enum: AdPlacement,
    description: 'Filter by placement',
  })
  @IsEnum(AdPlacement)
  @IsOptional()
  placement?: AdPlacement;

  @ApiPropertyOptional({ description: 'Filter by creator user ID' })
  @IsString()
  @IsOptional()
  created_by_id?: string;

  @ApiPropertyOptional({ description: 'Filter by country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Search by title or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsDateString()
  @IsOptional()
  start_date_from?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsDateString()
  @IsOptional()
  start_date_to?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;
}
