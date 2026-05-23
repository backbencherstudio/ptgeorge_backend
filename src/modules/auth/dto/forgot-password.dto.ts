import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: 'OTP code sent to email' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'reset_token_123',
    description: 'Reset token from OTP verification',
  })
  @IsString()
  @IsNotEmpty()
  reset_token: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'New password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  new_password: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Confirm new password',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  confirm_password: string;
}
