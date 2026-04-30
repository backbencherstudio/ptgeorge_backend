import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description:
      'Human-readable role title. Auto-slugified into the role name/key.',
    example: 'Church Main Admin',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Short description of what this role can do.',
    example: 'Verified full control within their church only',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Hex color for the role badge in the UI (Access Scope color picker).',
    example: '#3b82f6',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'color must be a valid hex color e.g. #3b82f6',
  })
  color?: string;
}
