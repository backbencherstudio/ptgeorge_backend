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
 
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  // @IsNotEmpty()
  // @ApiProperty()
  // first_name?: string;

  // @IsNotEmpty()
  // @ApiProperty()
  // last_name?: string;

  // @IsNotEmpty()
  // @ApiProperty()
  // address?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: UserType,
    default: UserType.CLIENT,
  })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;
}
