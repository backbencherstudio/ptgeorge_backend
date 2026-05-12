import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateChurchDto {
  @ApiPropertyOptional({ example: 'Grace Church' })
  @IsOptional()
  @IsString()
  church_name?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  church_city?: string;

  @ApiPropertyOptional({ example: 'grace@church.com' })
  @IsOptional()
  @IsString()
  church_email?: string;

  @ApiPropertyOptional({ example: 'gracechurch.org' })
  @IsOptional()
  @IsString()
  church_domain?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  church_adminname?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  church_members?: number;
}
