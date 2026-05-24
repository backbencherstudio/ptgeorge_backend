import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { AdStatus, AdPlacement } from 'prisma/generated/enums';

export class CreateAdDto {
  @ApiProperty({ example: 'Bible Study App – DigiSanctuary' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Join our Bible study community' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsUrl()
  @IsNotEmpty()
  link: string;

  @ApiProperty({ enum: AdStatus, default: AdStatus.ACTIVE, required: false })
  @IsEnum(AdStatus)
  @IsOptional()
  status?: AdStatus;

  @ApiProperty({ enum: AdPlacement, default: AdPlacement.HOME_BANNER, required: false })
  @IsEnum(AdPlacement)
  @IsOptional()
  placement?: AdPlacement;

  @ApiProperty({ 
    description: 'Target country (optional, if not provided shows to all)',
    example: 'USA',
    required: false 
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ 
    description: 'Target city/state (optional, requires country)',
    example: 'New York',
    required: false 
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '2025-01-10T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;
}
