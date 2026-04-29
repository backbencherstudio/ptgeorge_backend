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
  @ApiProperty({ example: 'Grace Church' })
  @IsString()
  @IsNotEmpty()
  church_name: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  church_city: string;

  @ApiProperty({ example: 'church@example.com' })
  @IsEmail()
  church_email: string;

  @ApiProperty({ example: 'gracechurch.com' })
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/,
    { message: 'Invalid domain format' },
  )
  church_domain: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  church_password: string;

  @ApiPropertyOptional({ example: 'John Admin' })
  @IsOptional()
  @IsString()
  church_adminname?: string;

  // --------------------------
  // ENUM FIELDS (IMPORTANT)
  // --------------------------

  @ApiPropertyOptional({
    enum: ChurchStatus,
    default: ChurchStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ChurchStatus)
  status?: ChurchStatus;

  @ApiPropertyOptional({
    enum: ChurchAuthType,
    default: ChurchAuthType.CHURCH_ADMIN,
  })
  @IsOptional()
  @IsEnum(ChurchAuthType)
  auth_type?: ChurchAuthType;
}