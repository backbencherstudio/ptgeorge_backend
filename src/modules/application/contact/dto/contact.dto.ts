import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'First name of the contact person',
    example: 'John',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Last name of the contact person',
    example: 'Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Phone number of the contact person',
    example: '+1234567890',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'Email address of the contact person',
    example: 'john.doe@example.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Subject of the contact message',
    example: 'Hospitality',
    required: true,
    enum: [
      'Hospitality',
      'Support',
      'Sales',
      'General Inquiry',
      'Feedback',
      'Other',
    ],
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Message content',
    example: 'I would like to know more about your services...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}