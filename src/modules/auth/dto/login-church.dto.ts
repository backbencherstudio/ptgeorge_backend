import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChurchLoginDto {
  @ApiProperty({ example: 'church@example.com' })
  @IsEmail()
  church_email: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @IsNotEmpty()
  church_password: string;
}