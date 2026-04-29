import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ChurchAuthType } from 'prisma/generated/client';


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

  @ApiProperty({ example: 'https://gracechurch.com' })
  @IsString()
  @IsNotEmpty()
  church_domain: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  church_password: string;

  @ApiPropertyOptional({ example: 'John Admin' })
  @IsOptional()
  @IsString()
  church_adminname?: string;

  

  
}