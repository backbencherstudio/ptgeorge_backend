import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsIn } from 'class-validator';

export class UpdateMemberDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'PASTOR' })
  @IsOptional()
  @IsString()
  role_name?: string;

  @ApiPropertyOptional({ example: 'Leader' })
  @IsOptional()
  @IsString()
  church_role?: string;

  @ApiPropertyOptional({ description: 'Church ID (for super admin)' })
  @IsOptional()
  @IsString()
  church_id?: string;
}