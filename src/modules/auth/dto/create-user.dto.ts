import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserType } from 'prisma/generated';

export class CreateUserDto {
 
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  last_name: string;


  @ApiProperty({ example: '088+123456789' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ example: 'churchname' })
  @IsString()
  @IsNotEmpty()
  church_name: string;

  @ApiProperty({ example: 'bangla' })
  @IsString()
  @IsNotEmpty()
  language: string;

  // ------ professional setup

  @ApiProperty({ example: 'Pas' })



  // ------ email,password and type

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: UserType,
    default: UserType.USER,
  })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;
}
