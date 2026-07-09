import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProfileDto } from './create-profile.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile avatar image file',
  })
  @IsOptional()
  avatar?: any;

  @ApiPropertyOptional({
    description: 'When true and no new avatar uploaded, remove existing avatar',
    example: 'true',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  remove_avatar?: boolean;

  // Override fields to make them optional and remove @IsNotEmpty for updates
  @ApiPropertyOptional({
    example: 'Jessica',
    description: 'First name of the user',
  })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({
    example: 'Martinez',
    description: 'Last name of the user',
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    example: '+16485550234',
    description: 'Phone number with country code',
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

  @ApiPropertyOptional({
    example: 'Little Angels Childcare',
    description: 'Company name',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'info@littleangelscare.com',
    description: 'Business email',
  })
  @IsOptional()
  @IsString()
  business_email?: string;

  @ApiPropertyOptional({
    example: '+16485550300',
    description: 'Business phone number',
  })
  @IsOptional()
  @IsString()
  business_phone?: string;

  @ApiPropertyOptional({
    example: 'Childcare Services',
    description: 'Type of service offered',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    example: 'Childcare',
    description: 'Business category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'Licensed Childcare Provider',
    description: 'Profession',
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    example: 'www.littleangelscare.com',
    description: 'Company website URL',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    example: '+16485550301',
    description: 'WhatsApp number',
  })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({
    example: 'Monday to Friday, 8 AM to 6 PM',
    description: 'Available time',
  })
  @IsOptional()
  @IsString()
  available_time?: string;

  @ApiPropertyOptional({
    example: '456 Park Avenue, New York, NY 10022',
    description: 'Business address line 1',
  })
  @IsOptional()
  @IsString()
  address_line1?: string;

  @ApiPropertyOptional({
    example: 'Suite 100',
    description: 'Business address line 2',
  })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'State/Province/Region',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: '10022',
    description: 'ZIP/Postal code',
  })
  @IsOptional()
  @IsString()
  zip_code?: string;

  @ApiPropertyOptional({
    example:
      'Experienced childcare provider with 10+ years serving church families',
    description: 'Business description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Brooklyn, NY; Queens, NY',
    description: 'Other service locations',
  })
  @IsOptional()
  @IsString()
  other_locations?: string;

  // Additional fields that might be in your User model
  @ApiPropertyOptional({
    example: 'About me text',
    description: 'About me section',
  })
  @IsOptional()
  @IsString()
  about_me?: string;

  @ApiPropertyOptional({
    example: '123 Main St',
    description: 'Address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Display name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'New York, USA',
    description: 'Location',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'Bio text here',
    description: 'User bio',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    example: 'johndoe',
    description: 'Username',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Male',
    description: 'Gender',
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    example: '1990-01-01',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @ApiPropertyOptional({
    example: 'Available',
    description: 'Availability status',
  })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({
    example: 'Grace Church',
    description: 'Church name',
  })
  @IsOptional()
  @IsString()
  church_name?: string;
}
