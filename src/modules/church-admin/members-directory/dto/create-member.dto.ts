import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsUUID,
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
  @MinLength(8)
  password?: string;

  @ApiProperty({
    example: 'cm6abcdef12345',
    description: 'Role ID from Role model',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  role_id: string;

  @ApiPropertyOptional({
    description: 'Church ID - Required for SUPER_ADMIN',
  })
  @IsOptional()
  @IsUUID()
  church_id?: string;
}
