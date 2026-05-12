import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRoleDto } from './create-roles.dto';
import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiPropertyOptional({
    description:
      'Human-readable role title. Auto-slugified into the role name/key. ' +
      'System role titles (super_admin, system_admin) cannot be changed.',
    example: 'Church Main Admin',
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Short description of what this role can do.',
    example: 'Verified full control within their church only',
    maxLength: 500,
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Hex color for the role badge in the UI (Access Scope color picker).',
    example: '#3b82f6',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
    type: String,
  })
  @IsString()
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'color must be a valid hex color e.g. #3b82f6',
  })
  color?: string;
}
