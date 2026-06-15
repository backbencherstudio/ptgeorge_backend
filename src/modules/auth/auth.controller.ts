import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { LocalAuthGuard } from 'src/modules/auth/guards/local-auth.guard';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  UnifiedLoginDto,
} from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateChurchDto } from './dto/create-church.dto';
import { ChurchLoginDto } from './dto/login-church.dto';
import appConfig from 'src/config/app.config';
import { ForgotPasswordDto, ResetPasswordDto, VerifyOtpDto } from './dto/forgot-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // me super_admin-token
  @ApiBearerAuth('pro_user-token')
  @ApiOperation({
    summary: 'Get current user details',
    description: 'Retrieve authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          email: 'user@example.com',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  // User registration endpoint
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: `Creates a new user account. Supports both regular users and professional users.

**Account Types:**
- **USER**: Looking for services (church members, regular users)
- **PRO_USER**: Offering services (professionals, freelancers, business owners)

**Professional fields are required for PRO_USER accounts only.**

After registration:
1. Account status will be 'pending'
2. Admin approval required
3. Email verification required before login`,
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User registration data',
    examples: {
      regular_user: {
        summary: '📋 Regular User (Looking for services)',
        description: 'For users who want to find church services',
        value: {
          first_name: 'Jessica',
          last_name: 'Martinez',
          phone_number: '+16485550234',
          church_id: 'church_123',
          language: 'English',
          email: 'jessica.m@gmail.com',
          password: 'Password@123',
          confirm_password: 'Password@123',
          type: 'USER',
          agree_to_terms: true,
        },
      },
      professional_user: {
        summary: '💼 Professional User (Offering services)',
        description: 'For professionals, freelancers, or business owners',
        value: {
          first_name: 'Jessica',
          last_name: 'Martinez',
          phone_number: '+16485550234',
          church_id: 'church_123',
          language: 'English',
          email: 'jessica.m@gmail.com',
          password: 'Password@123',
          confirm_password: 'Password@123',
          type: 'PRO_USER',
          agree_to_terms: true,
          company_name: 'Little Angels Childcare',
          business_email: 'info@littleangelscare.com',
          business_phone: '+16485550300',
          service: 'Childcare Services',
          category: 'Childcare',
          profession: 'Licensed Childcare Provider',
          website: 'www.littleangelscare.com',
          whatsapp_number: '+16485550301',
          available_time: 'Monday to Friday, 8 AM to 6 PM',
          address_line1: '456 Park Avenue, New York, NY 10022',
          state: 'New York',
          country: 'USA',
          zip_code: '10022',
          description:
            'Experienced childcare provider with 10+ years serving church families.',
          other_locations: 'Brooklyn, NY; Queens, NY',
        },
      },
    },
  })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // User login endpoint
  // User login endpoint
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unified Login',
    description: `Authenticate a user. All users login through this endpoint.

**User Types vs Assignable Roles:**
- \`user.type\` determines system-level access (SUPER_ADMIN, ADMIN, CHURCH_ADMIN, PRO_USER, USER)
- Assignable roles (CHURCH_LEADER, PASTOR, HELPER, etc.) provide church-specific permissions

**Test Credentials by User Type:**

| User Type | Email | Password | Assignable Role |
|-----------|-------|----------|-----------------|
| **SUPER_ADMIN** | superadmin@gmail.com | SuperAdmin@123 | N/A |
| **ADMIN** | admin@platform.com | Password@123 | N/A |
| **CHURCH_ADMIN (Grace)** | admin@gracechurch.org | Password@123 | N/A |
| **CHURCH_ADMIN (Faith)** | admin@faithassembly.org | Password@123 | N/A |
| **USER (Pastor - Grace)** | pastor@gracechurch.org | Password@123 | PASTOR |
| **USER (Assistant Pastor - Grace)** | assistant_pastor@gracechurch.org | Password@123 | ASSISTANT_PASTOR |
| **USER (Church Leader - Grace)** | leader@gracechurch.org | Password@123 | CHURCH_LEADER |
| **USER (Background Checker - Grace)** | checker@gracechurch.org | Password@123 | BACKGROUND_CHECKER |
| **USER (Helper - Grace)** | helper@gracechurch.org | Password@123 | HELPER |
| **USER (Church Member - Grace)** | member@gracechurch.org | Password@123 | CHURCH_MEMBER |
| **PRO_USER (Verified Pro - Grace)** | pro@gracechurch.org | Password@123 | N/A |
| **USER (Regular User - Grace)** | user@gracechurch.org | Password@123 | N/A |
| **USER (Pastor - Faith)** | pastor@faithassembly.org | Password@123 | PASTOR |
| **USER (Helper - Faith)** | helper@faithassembly.org | Password@123 | HELPER |
| **USER (Church Member - Faith)** | member@faithassembly.org | Password@123 | CHURCH_MEMBER |

**Note:** 
- SUPER_ADMIN and ADMIN have system-wide access
- CHURCH_ADMIN users have full control over their specific church
- PRO_USER users are verified professionals with additional profile fields
- Regular USER users can have assignable roles (PASTOR, HELPER, etc.) for church-specific permissions`,
  })
  @ApiBody({
    type: UnifiedLoginDto,
    examples: {
      super_admin: {
        summary: 'Super Admin Login (System-wide access)',
        description: 'User type: SUPER_ADMIN',
        value: {
          email: appConfig().defaultUser.system.email || 'superadmin@gmail.com',
          password: appConfig().defaultUser.system.password || 'SuperAdmin@123',
        },
      },
      admin: {
        summary: 'Platform Admin Login',
        description: 'User type: ADMIN',
        value: {
          email: 'admin@platform.com',
          password: 'Password@123',
        },
      },
      church_admin_grace: {
        summary: 'Church Admin - Grace Community Church',
        description: 'User type: CHURCH_ADMIN',
        value: {
          email: 'admin@gracechurch.org',
          password: 'Password@123',
        },
      },
      church_admin_faith: {
        summary: 'Church Admin - Faith Assembly Church',
        description: 'User type: CHURCH_ADMIN',
        value: {
          email: 'admin@faithassembly.org',
          password: 'Password@123',
        },
      },
      pastor_grace: {
        summary: 'Pastor - Grace Community Church',
        description: 'User type: USER, Assignable role: PASTOR',
        value: {
          email: 'pastor@gracechurch.org',
          password: 'Password@123',
        },
      },
      assistant_pastor_grace: {
        summary: 'Assistant Pastor - Grace Community Church',
        description: 'User type: USER, Assignable role: ASSISTANT_PASTOR',
        value: {
          email: 'assistant_pastor@gracechurch.org',
          password: 'Password@123',
        },
      },
      church_leader_grace: {
        summary: 'Church Leader - Grace Community Church',
        description: 'User type: USER, Assignable role: CHURCH_LEADER',
        value: {
          email: 'leader@gracechurch.org',
          password: 'Password@123',
        },
      },
      background_checker_grace: {
        summary: 'Background Checker - Grace Community Church',
        description: 'User type: USER, Assignable role: BACKGROUND_CHECKER',
        value: {
          email: 'checker@gracechurch.org',
          password: 'Password@123',
        },
      },
      helper_grace: {
        summary: 'Helper - Grace Community Church',
        description: 'User type: USER, Assignable role: HELPER',
        value: {
          email: 'helper@gracechurch.org',
          password: 'Password@123',
        },
      },
      church_member_grace: {
        summary: 'Church Member - Grace Community Church',
        description: 'User type: USER, Assignable role: CHURCH_MEMBER',
        value: {
          email: 'member@gracechurch.org',
          password: 'Password@123',
        },
      },
      pro_user_grace: {
        summary: 'Verified Professional - Grace Community Church',
        description: 'User type: PRO_USER (No assignable role)',
        value: {
          email: 'pro@gracechurch.org',
          password: 'Password@123',
        },
      },
      regular_user_grace: {
        summary: 'Regular User - Grace Community Church',
        description: 'User type: USER (No assignable role)',
        value: {
          email: 'user@gracechurch.org',
          password: 'Password@123',
        },
      },
      pastor_faith: {
        summary: 'Pastor - Faith Assembly Church',
        description: 'User type: USER, Assignable role: PASTOR',
        value: {
          email: 'pastor@faithassembly.org',
          password: 'Password@123',
        },
      },
      helper_faith: {
        summary: 'Helper - Faith Assembly Church',
        description: 'User type: USER, Assignable role: HELPER',
        value: {
          email: 'helper@faithassembly.org',
          password: 'Password@123',
        },
      },
      church_member_faith: {
        summary: 'Church Member - Faith Assembly Church',
        description: 'User type: USER, Assignable role: CHURCH_MEMBER',
        value: {
          email: 'member@faithassembly.org',
          password: 'Password@123',
        },
      },
    },
  })
  async unifiedLogin(
    @Body() loginDto: UnifiedLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.unifiedLogin(loginDto);

    if (result.authorization?.refresh_token) {
      res.cookie('refresh_token', result.authorization.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
    }

    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone_number: { type: 'string' },
        language: { type: 'string' },
        address_line1: { type: 'string' },
        address_line2: { type: 'string' },
        state: { type: 'string' },
        country: { type: 'string' },
        zip_code: { type: 'string' },
        company_name: { type: 'string' },
        business_email: { type: 'string' },
        business_phone: { type: 'string' },
        service: { type: 'string' },
        category: { type: 'string' },
        profession: { type: 'string' },
        website: { type: 'string' },
        whatsapp_number: { type: 'string' },
        available_time: { type: 'string' },
        description: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPEG, PNG, and WEBP images are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async updateUserProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.authService.updateUser(userId, updateUserDto, userId, image);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 1: Request password reset OTP',
    description: 'Send OTP to user email for password reset',
  })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 2: Verify OTP and get reset token',
    description: 'Verify the OTP sent to email and receive a reset token',
  })
  @ApiBody({ type: VerifyOtpDto })
  async verifyResetOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyResetOtp(verifyOtpDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 3: Reset password using reset token',
    description:
      'Reset password using the reset token received from OTP verification',
  })
  @ApiBody({ type: ResetPasswordDto })
  async resetPasswordWithToken(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPasswordWithToken(resetPasswordDto);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify user email',
    description: 'Verify email address with token sent via email',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyEmail({
        email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }

  @Post('resend-verification-email')
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Send verification email with OTP code again to user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent successfully',
    schema: {
      example: {
        success: true,
        message: 'We have sent a verification code to your email',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send email',
  })
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend password reset OTP',
    description: 'Resend OTP for password reset',
  })
  @ApiBody({ type: ForgotPasswordDto })
  async resendOtp(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.resendToken(forgotPasswordDto.email);
  }

  @Post('verify-token')
  @ApiOperation({
    summary: 'Verify password reset token',
    description: 'Verify if password reset OTP token is valid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'token'],
      properties: {
        email: { type: 'string', format: 'email' },
        token: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Token verified successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token or email not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing email or token',
  })
  async verifyToken(@Body() data: { email: string; token: string }) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyToken({
        email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to verify token',
      };
    }
  }

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change user password',
    description:
      'Change password for authenticated user. Old password must be valid and new password must be at least 8 characters.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['old_password', 'new_password'],
      properties: {
        old_password: { type: 'string', description: 'Current password' },
        new_password: {
          type: 'string',
          minLength: 8,
          description: 'New password (min 8 characters)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        message: 'Password updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized, user not found, or invalid old password',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing old_password or new_password',
  })
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  /*=====================================================
                      Church Section  Start
  =====================================================*/

  @Post('church/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new church',
    description:
      'Create a new church account. This will automatically create a CHURCH_ADMIN user account with the same email and password.',
  })
  @ApiBody({
    type: CreateChurchDto,
    description: 'Church registration data',
    examples: {
      church: {
        summary: 'Church Registration',
        value: {
          church_name: 'Grace Community Church',
          church_city: 'New York',
          church_email: 'admin@gracechurch.org',
          church_domain: 'gracechurch.org',
          church_password: 'Password@123',
          church_adminname: 'John Smith',
        },
      },
    },
  })
  async createChurch(@Body() createChurchDto: CreateChurchDto) {
    try {
      return await this.authService.createChurch(createChurchDto);
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //-----------------------------------------------(end)----------------------------------------------------------------------

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh JWT token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    schema: {
      example: {
        success: true,
        authorization: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  async refreshToken(
    @Req() req: Request,
    @Body() body: { refresh_token: string },
  ) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
