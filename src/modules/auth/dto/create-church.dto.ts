import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { ChurchAuthType, ChurchStatus } from 'prisma/generated/client';

export class CreateChurchDto {
  @ApiProperty({ example: 'Grace Community Church' })
  @IsNotEmpty()
  @IsString()
  church_name: string;

  @ApiProperty({ example: 'New York' })
  @IsNotEmpty()
  @IsString()
  church_city: string;

  @ApiProperty({ example: 'admin@gracechurch.org' })
  @IsNotEmpty()
  @IsEmail()
  church_email: string;

  @ApiProperty({ example: 'gracechurch.org' })
  @IsNotEmpty()
  @IsString()
  church_domain: string;

  @ApiProperty({ example: 'Password@123' })
  @IsNotEmpty()
  @MinLength(8)
  church_password: string;

  @ApiProperty({ example: 'John Smith' })
  @IsNotEmpty()
  @IsString()
  church_adminname: string;

  @ApiProperty({
    required: false,
    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'PENDING',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    enum: ['SYSTEM_ADMIN', 'EDITOR', 'HELPER', 'CHURCH_ADMIN'],
    default: 'CHURCH_ADMIN',
  })
  @IsOptional()
  @IsString()
  auth_type?: string;
}