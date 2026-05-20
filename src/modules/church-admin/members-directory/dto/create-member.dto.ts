import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

export class CreateMemberDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Smith', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiPropertyOptional({ example: 'en', description: 'Language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description: 'Password (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    example: 'CHURCH_MEMBER',
    description: 'System role name',
  })
  @IsOptional()
  @IsString()
  role_name?: string;

  @ApiPropertyOptional({
    example: 'Member',
    description: 'Role within the church',
  })
  @IsOptional()
  @IsString()
  church_role?: string;

  @ApiPropertyOptional({ description: 'Church ID (required for super admin)' })
  @IsOptional()
  @IsString()
  church_id?: string;
}
