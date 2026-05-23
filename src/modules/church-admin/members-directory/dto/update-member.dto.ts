import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'suspended'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'cm6abcdef12345',
    description: 'Role ID to assign',
  })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiPropertyOptional({ description: 'Church ID (for super admin)' })
  @IsOptional()
  @IsUUID()
  church_id?: string;
}
