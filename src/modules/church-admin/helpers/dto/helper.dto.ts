// dto/helper.dto.ts - Updated (removed rating)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsUrl,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export class CreateHelperDto {
  // ==================== PERSONAL INFORMATION ====================
  @ApiProperty({
    example: 'David',
    description: 'First name of the helper',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    example: 'Kim',
    description: 'Last name of the helper',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    example: 'david.kim@example.com',
    description: 'Personal email address (must be unique)',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '+16485550123',
    description: 'Personal phone number with country code',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    example: 'English',
    description: 'Preferred service language',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description: 'User password (auto-generated if not provided)',
  })
  @IsOptional()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password?: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description: 'Confirm password (required if password is provided)',
  })
  @ValidateIf((o) => o.password)
  @IsString()
  @MinLength(8)
  confirm_password?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Agree to terms and conditions',
  })
  @IsOptional()
  agree_to_terms?: boolean;

  // ==================== HELPER SPECIFIC INFORMATION ====================
  @ApiPropertyOptional({
    example: 'Experienced volunteer with 5+ years serving the community',
    description: 'Short bio or about me',
  })
  @IsOptional()
  @IsString()
  about_me?: string;

  @ApiPropertyOptional({
    example: 'Weekends, 9 AM - 5 PM',
    description: 'Availability schedule',
  })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Profile picture URL',
  })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    example: '123 Main Street',
    description: 'Street address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'NY',
    description: 'State/Province',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: '10001',
    description: 'ZIP/Postal code',
  })
  @IsOptional()
  @IsString()
  zip_code?: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'Male',
    description: 'Gender',
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    example: '1990-01-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @ApiPropertyOptional({
    example: 'Passionate about helping others and serving the church community',
    description: 'Longer biography',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    example: ['Transportation', 'Childcare', 'Tech Support', 'Worship Team'],
    description: 'List of skills and expertise areas',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  // ==================== PROFESSIONAL SETUP (OPTIONAL FOR HELPERS) ====================
  @ApiPropertyOptional({
    example: 'Kim Transportation Services',
    description: 'Company name (if helper is also a professional)',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'business@kimtransport.com',
    description: 'Business email (if helper is also a professional)',
  })
  @IsOptional()
  @IsEmail()
  business_email?: string;

  @ApiPropertyOptional({
    example: '+16485550999',
    description: 'Business phone number (if helper is also a professional)',
  })
  @IsOptional()
  @IsString()
  business_phone?: string;

  @ApiPropertyOptional({
    example: 'Transportation Services',
    description: 'Type of service offered (if helper is also a professional)',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    example: 'Transportation',
    description: 'Business category (if helper is also a professional)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'Professional Driver',
    description: 'Profession (if helper is also a professional)',
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    example: 'www.kimtransport.com',
    description: 'Company website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: '+16485550998',
    description: 'WhatsApp number',
  })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({
    example: 'Monday to Friday, 8 AM to 6 PM',
    description: 'Available time for professional services',
  })
  @IsOptional()
  @IsString()
  available_time?: string;

  @ApiPropertyOptional({
    example: '456 Park Avenue, Suite 100',
    description: 'Business address line 1',
  })
  @IsOptional()
  @IsString()
  address_line1?: string;

  @ApiPropertyOptional({
    example: 'Floor 2',
    description: 'Business address line 2',
  })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiPropertyOptional({
    example: 'Experienced transportation provider with 10+ years of service',
    description: 'Business description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/portfolio.pdf',
    description: 'Business portfolio URL or file path',
  })
  @IsOptional()
  @IsString()
  business_portfolio?: string;

  @ApiPropertyOptional({
    example: 'Brooklyn, NY; Queens, NY',
    description: 'Other service locations',
  })
  @IsOptional()
  @IsString()
  other_locations?: string;
}

export class UpdateHelperDto {
  // ==================== PERSONAL INFORMATION ====================
  @ApiPropertyOptional({
    example: 'David',
    description: 'First name of the helper',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_name?: string;

  @ApiPropertyOptional({
    example: 'Kim',
    description: 'Last name of the helper',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  last_name?: string;

  @ApiPropertyOptional({
    example: '+16485550123',
    description: 'Personal phone number with country code',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({
    example: 'English',
    description: 'Preferred service language',
  })
  @IsOptional()
  @IsString()
  language?: string;

  // ==================== HELPER SPECIFIC INFORMATION ====================
  @ApiPropertyOptional({
    example: 'Experienced volunteer with 5+ years serving the community',
    description: 'Short bio or about me',
  })
  @IsOptional()
  @IsString()
  about_me?: string;

  @ApiPropertyOptional({
    example: 'Weekends, 9 AM - 5 PM',
    description: 'Availability schedule',
  })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Profile picture URL',
  })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    example: '123 Main Street',
    description: 'Street address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'NY',
    description: 'State/Province',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: '10001',
    description: 'ZIP/Postal code',
  })
  @IsOptional()
  @IsString()
  zip_code?: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'Male',
    description: 'Gender',
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    example: '1990-01-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @ApiPropertyOptional({
    example: 'Passionate about helping others and serving the church community',
    description: 'Longer biography',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    example: ['Transportation', 'Childcare', 'Tech Support', 'Worship Team'],
    description: 'List of skills and expertise areas',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  // ==================== PROFESSIONAL SETUP (OPTIONAL FOR HELPERS) ====================
  @ApiPropertyOptional({
    example: 'Kim Transportation Services',
    description: 'Company name',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'business@kimtransport.com',
    description: 'Business email',
  })
  @IsOptional()
  @IsEmail()
  business_email?: string;

  @ApiPropertyOptional({
    example: '+16485550999',
    description: 'Business phone number',
  })
  @IsOptional()
  @IsString()
  business_phone?: string;

  @ApiPropertyOptional({
    example: 'Transportation Services',
    description: 'Type of service offered',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    example: 'Transportation',
    description: 'Business category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'Professional Driver',
    description: 'Profession',
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    example: 'www.kimtransport.com',
    description: 'Company website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: '+16485550998',
    description: 'WhatsApp number',
  })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({
    example: 'Monday to Friday, 8 AM to 6 PM',
    description: 'Available time for professional services',
  })
  @IsOptional()
  @IsString()
  available_time?: string;

  @ApiPropertyOptional({
    example: '456 Park Avenue, Suite 100',
    description: 'Business address line 1',
  })
  @IsOptional()
  @IsString()
  address_line1?: string;

  @ApiPropertyOptional({
    example: 'Floor 2',
    description: 'Business address line 2',
  })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiPropertyOptional({
    example: 'Experienced transportation provider with 10+ years of service',
    description: 'Business description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/portfolio.pdf',
    description: 'Business portfolio URL or file path',
  })
  @IsOptional()
  @IsString()
  business_portfolio?: string;

  @ApiPropertyOptional({
    example: 'Brooklyn, NY; Queens, NY',
    description: 'Other service locations',
  })
  @IsOptional()
  @IsString()
  other_locations?: string;

  // Portfolio images management
  @ApiPropertyOptional({
    type: [String],
    description: 'Array of portfolio image URLs to delete',
    example: ['https://storage.example.com/portfolio/portfolio_123.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  delete_portfolio_images?: string[];
}

export class PortfolioDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Array of image URLs to delete',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deleteImages?: string[];
}
