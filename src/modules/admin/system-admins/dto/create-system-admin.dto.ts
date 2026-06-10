import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserStatus } from 'prisma/generated/enums';

export class CreateSystemAdminDto {
  @ApiProperty({ example: 'Tom' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  first_name: string;

  @ApiProperty({ example: 'Reeves' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  last_name: string;

  @ApiProperty({ example: 'tom@platform.com' })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phone_number?: string;

  @ApiProperty({ example: 'en', required: false, default: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  language?: string;

  @ApiProperty({
    description: 'Array of permission IDs to assign to this admin',
    example: ['clxperm001abc', 'clxperm002abc'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateSystemAdminDto extends PartialType(CreateSystemAdminDto) {
  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: 'Array of permission IDs to assign to this admin',
    example: ['clxperm001abc', 'clxperm002abc'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
