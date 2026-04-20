import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
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

  // ------ professional setup (ONLY FOR PRO_USER)

  @ApiProperty({ example: 'company name' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @ApiProperty({ example: 'business email' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsEmail()
  @IsNotEmpty()
  business_email: string;

  @ApiProperty({ example: 'business phone' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  business_phone: string;

  @ApiProperty({ example: 'service' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({ example: 'category' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'profession' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiProperty({ example: 'website' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  website: string;

  @ApiProperty({ example: 'whatsapp number' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  whatsapp_number: string;

  @ApiProperty({ example: 'available time' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  available_time: string;

  @ApiProperty({ example: 'address_line1' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  address_line1: string;

  @ApiProperty({ example: 'address_line2' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  address_line2: string;

  @ApiProperty({ example: 'state' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'country' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'zip code' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  zip_code: string;

  @ApiProperty({ example: 'business_portfolio' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  business_portfolio: string;

  @ApiProperty({ example: 'description' })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  description: string;

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
