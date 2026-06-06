import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEmail } from 'class-validator';

export class UpdateChurchDto {
  @ApiPropertyOptional({ example: 'Grace Community Church' })
  @IsOptional()
  @IsString()
  church_name?: string;

  @ApiPropertyOptional({ example: 'New York, NY' })
  @IsOptional()
  @IsString()
  church_city?: string;

  @ApiPropertyOptional({ example: 'contact@graceny.org' })
  @IsOptional()
  @IsEmail()
  church_email?: string;

  @ApiPropertyOptional({ example: 'graceny.org' })
  @IsOptional()
  @IsString()
  church_domain?: string;

  @ApiPropertyOptional({ example: '125 East 84th Street, New York, NY 10028' })
  @IsOptional()
  @IsString()
  church_address?: string;

  @ApiPropertyOptional({
    example:
      "A vibrant community church serving Manhattan's Upper East Side for over 70 years.",
  })
  @IsOptional()
  @IsString()
  church_description?: string;

  @ApiPropertyOptional({ example: '+1 212 555 0100' })
  @IsOptional()
  @IsString()
  church_phone?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  church_members?: number;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  church_adminname?: string;
}
