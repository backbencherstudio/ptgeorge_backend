import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryChurchDto {
  @ApiPropertyOptional({
    example: 'grace',
    description: 'Search by name, city, email, domain, admin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({
    description:
      'Comma-separated list of fields to return (e.g., fields=id,church_name,church_city)',
    example: 'id,church_name,church_city,status',
    type: String,
  })
  @IsOptional()
  @IsString()
  fields?: string;
}
