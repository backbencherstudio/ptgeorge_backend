// dto/create-user.dto.ts (updated with better Swagger docs)
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
import { UserType } from 'prisma/generated/enums';

export class CreateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    example: '+880123456789',
    description: 'Phone number with country code',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    example: 'Grace Community Church',
    description: 'Name of the church',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  church_name: string;

  @ApiProperty({
    example: 'en',
    description: 'Preferred language (en, bn, etc.)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  // Professional setup fields (ONLY FOR PRO_USER)
  @ApiPropertyOptional({
    example: 'Tech Solutions Ltd',
    description: 'Company name (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @ApiPropertyOptional({
    example: 'business@techsolutions.com',
    description: 'Business email (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsEmail()
  @IsNotEmpty()
  business_email: string;

  @ApiPropertyOptional({
    example: '+880555123456',
    description: 'Business phone number (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  business_phone: string;

  @ApiPropertyOptional({
    example: 'Software Development',
    description: 'Type of service (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiPropertyOptional({
    example: 'Technology',
    description: 'Business category (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    example: 'Full Stack Developer',
    description: 'Profession (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiPropertyOptional({
    example: 'https://techsolutions.com',
    description: 'Company website (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  website: string;

  @ApiPropertyOptional({
    example: '+880555123456',
    description: 'WhatsApp number (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  whatsapp_number: string;

  @ApiPropertyOptional({
    example: '9:00 AM - 6:00 PM',
    description: 'Available time (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  available_time: string;

  @ApiPropertyOptional({
    example: '123 Business Street',
    description: 'Address line 1 (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  address_line1: string;

  @ApiPropertyOptional({
    example: 'Suite 100',
    description: 'Address line 2 (optional, but required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  address_line2: string;

  @ApiPropertyOptional({
    example: 'California',
    description: 'State (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Country (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({
    example: '90210',
    description: 'ZIP/Postal code (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  zip_code: string;

  @ApiPropertyOptional({
    example: 'https://portfolio.com/johndoe',
    description: 'Business portfolio URL (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  business_portfolio: string;

  @ApiPropertyOptional({
    example: 'Leading tech solutions provider with 10+ years of experience',
    description: 'Business description (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty()
  description: string;

  // Email, password and type
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address (must be unique)',
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 8 characters)',
    required: true,
    minLength: 8,
  })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: UserType,
    default: UserType.USER,
    description: 'User type: USER, PRO_USER, CHURCH_ADMIN, or ADMIN',
    example: 'USER',
  })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;
}

// login.dto.ts
export class LoginDto {
  @ApiProperty({
    example: 'superadmin@gmail.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '12345678',
    description: 'User password',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}