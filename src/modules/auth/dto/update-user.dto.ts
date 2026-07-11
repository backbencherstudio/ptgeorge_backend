import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { UserType, UserStatus } from 'prisma/generated/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({
    example: 'English',
    description: 'Preferred language',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @ValidateIf(
    (o) => o.email !== undefined && o.email !== null && o.email !== '',
  )
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiPropertyOptional({ enum: UserType, description: 'User type' })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @ApiPropertyOptional({ enum: UserStatus, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Church ID (for super admin)' })
  @IsOptional()
  @IsUUID()
  church_id?: string;

  @ApiPropertyOptional({ description: 'Role ID to assign to user' })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  // Professional fields (for PRO_USER)
  @ApiPropertyOptional({
    example: 'Tech Solutions Inc',
    description: 'Company name',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({
    example: 'contact@techsolutions.com',
    description: 'Business email',
  })
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.business_email !== undefined &&
      o.business_email !== null &&
      o.business_email !== '',
  )
  @IsEmail({}, { message: 'Invalid business email format' })
  business_email?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Business phone',
  })
  @IsOptional()
  @IsString()
  business_phone?: string;

  @ApiPropertyOptional({
    example: 'IT Consulting',
    description: 'Service type',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ example: 'Technology', description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'IT Consultant', description: 'Profession' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    example: 'https://techsolutions.com',
    description: 'Website',
  })
  @IsOptional()
  @ValidateIf(
    (o) => o.website !== undefined && o.website !== null && o.website !== '',
  )
  @IsUrl({}, { message: 'Invalid website URL format' })
  website?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'WhatsApp number',
  })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({
    example: 'Mon-Fri 9AM-6PM',
    description: 'Available time',
  })
  @IsOptional()
  @IsString()
  available_time?: string;

  @ApiPropertyOptional({
    example: '123 Business St',
    description: 'Address line 1',
  })
  @IsOptional()
  @IsString()
  address_line1?: string;

  @ApiPropertyOptional({ example: 'Suite 100', description: 'Address line 2' })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiPropertyOptional({ example: 'California', description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'USA', description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '90210', description: 'ZIP code' })
  @IsOptional()
  @IsString()
  zip_code?: string;

  @ApiPropertyOptional({
    example: 'Business description here',
    description: 'Description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Other locations',
    description: 'Other service locations',
  })
  @IsOptional()
  @IsString()
  other_locations?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Hide address from public profile',
  })
  @IsOptional()
  @IsBoolean()
  hide_address?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Work globally',
  })
  @IsOptional()
  @IsBoolean()
  work_globally?: boolean;
}
