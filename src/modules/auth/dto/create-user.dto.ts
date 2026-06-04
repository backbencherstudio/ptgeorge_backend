// dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserType } from 'prisma/generated/enums';

export class CreateUserDto {
  // ==================== PERSONAL INFORMATION ====================
  @ApiProperty({
    example: 'Jessica',
    description: 'First name of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    example: 'Martinez',
    description: 'Last name of the user',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    example: '+16485550234',
    description: 'Phone number with country code',
    required: true,
  })
  // @IsPhoneNumber()
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    example: 'church_123',
    description: 'Church ID from church selection dropdown',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  church_id: string;

  @ApiProperty({
    example: 'English',
    description: 'Preferred service language',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    example: 'jessica.m@gmail.com',
    description: 'User email address (must be unique)',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description: 'User password (optional for admin creation)',
  })
  @IsOptional()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password?: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description: 'Confirm password (optional for admin creation)',
  })
  @IsOptional()
  @MinLength(8)
  confirm_password?: string;

  @ApiProperty({
    enum: UserType,
    default: UserType.USER,
    description:
      'Account type: USER (looking for services) or PRO_USER (offering services)',
    example: UserType.USER,
    required: true,
  })
  @IsEnum(UserType)
  @IsNotEmpty()
  type: UserType;

  @ApiPropertyOptional({
    example: true,
    description:
      'Agree to terms and conditions, privacy policy, and community guidelines',
  })
  @IsOptional()
  agree_to_terms?: boolean;

  // ==================== PROFESSIONAL SETUP (PRO_USER ONLY) ====================
  @ApiPropertyOptional({
    example: 'Little Angels Childcare',
    description: 'Company name (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Company name is required for professional account' })
  company_name?: string;

  @ApiPropertyOptional({
    example: 'info@littleangelscare.com',
    description: 'Business email (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsEmail()
  @IsNotEmpty({
    message: 'Business email is required for professional account',
  })
  business_email?: string;

  @ApiPropertyOptional({
    example: '+16485550300',
    description: 'Business phone number (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({
    message: 'Business phone number is required for professional account',
  })
  business_phone?: string;

  @ApiPropertyOptional({
    example: 'Childcare Services',
    description: 'Type of service offered (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Service type is required for professional account' })
  service?: string;

  @ApiPropertyOptional({
    example: 'Childcare',
    description: 'Business category (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Category is required for professional account' })
  category?: string;

  @ApiPropertyOptional({
    example: 'Licensed Childcare Provider',
    description: 'Profession (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Profession is required for professional account' })
  profession?: string;

  @ApiPropertyOptional({
    example: 'www.littleangelscare.com',
    description: 'Company website URL (optional for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: '+16485550301',
    description: 'WhatsApp number (optional for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({
    example: 'Monday to Friday, 8 AM to 6 PM',
    description: 'Available time (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({
    message: 'Available time is required for professional account',
  })
  available_time?: string;

  @ApiPropertyOptional({
    example: '456 Park Avenue, New York, NY 10022',
    description: 'Business address line 1 (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Address is required for professional account' })
  address_line1?: string;

  @ApiPropertyOptional({
    example: 'Suite 100',
    description: 'Business address line 2 (optional for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'State/Province/Region (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'State is required for professional account' })
  state?: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Country (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Country is required for professional account' })
  country?: string;

  @ApiPropertyOptional({
    example: '10022',
    description: 'ZIP/Postal code (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'ZIP code is required for professional account' })
  zip_code?: string;

  @ApiPropertyOptional({
    example:
      'Experienced childcare provider with 10+ years serving church families',
    description: 'Business description (required for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsString()
  @IsNotEmpty({ message: 'Description is required for professional account' })
  description?: string;

  @ApiPropertyOptional({
    example: 'Brooklyn, NY; Queens, NY',
    description: 'Other service locations (optional for PRO_USER)',
  })
  @ValidateIf((o) => o.type === UserType.PRO_USER)
  @IsOptional()
  @IsString()
  other_locations?: string;
}

// ==================== LOGIN DTOS ====================
export class LoginDto {
  @ApiProperty({
    example: 'admin@gracechurch.org',
    description: 'Email address',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Password',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '2FA token if enabled on the account',
  })
  @IsOptional()
  @IsString()
  token?: string;
}

export class UnifiedLoginDto {
  @ApiProperty({
    example: 'admin@gracechurch.org',
    description: 'Email address (same email works for both user and church)',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Password (users and church admins use the same password)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '2FA token if enabled',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
