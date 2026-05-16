import {
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // me super_admin-token
  @ApiBearerAuth('super_admin-token')
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
  @ApiOperation({
    summary: 'Register a new user',
    description: `Creates a new standard USER account.

Validation Rules:
- Email must be unique and valid format
- Password must be at least 8 characters
- Phone number must be unique
- All required fields must be provided`,
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User registration data',
    examples: {
      user: {
        summary: 'User Registration',
        value: {
          first_name: 'John',
          last_name: 'Doe',
          phone_number: '+880123456789',
          church_name: 'Grace Community Church',
          language: 'en',
          email: 'john@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        message: 'User registered successfully',
        data: { userId: 1 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Email already registered or validation failed',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(@Body() data: CreateUserDto) {
    try {
      const response = await this.authService.register({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        church_name: data.church_name,
        language: data.language,
        email: data.email,
        password: data.password,
        type: data.type,
      });

      return response;
    } catch (error: any) {
      // Handle specific error types
      if (error.code === 'P2002') {
        return {
          success: false,
          message: 'Email already registered',
        };
      }

      return {
        success: false,
        message: error.message,
      };
    }
  }

  // User login endpoint
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unified Login - User or Church Authentication',
    description: `Authenticate as either a church administrator or regular user. The system automatically detects whether the email belongs to a church or a user.

**⚠️ IMPORTANT: Two Different Logins with Same Email:**

The email \`admin@gracechurch.org\` exists in BOTH tables with DIFFERENT passwords:

| Login Type | Password | What you can do |
|------------|----------|-----------------|
| **USER Login** (Person) | \`Password@123\` | Assign roles, manage users, church operations |
| **CHURCH Login** (Organization) | \`Church@2024\` | Church settings, domain management |

**Authentication Flow:**
1. System first checks if email exists in churches table
2. If found, authenticates as CHURCH entity using church_password
3. If not found or church login fails, checks users table
4. Authenticates as USER entity using user's password
5. Returns JWT tokens for authorized access

**For Role Assignment (church_main_admin):** Use USER login with \`Password@123\``,
  })
  @ApiBody({
    type: UnifiedLoginDto,
    description: 'Login credentials - email and password',
    examples: {
      // ───────────────── USER LOGIN (PERSON) FOR ROLE ASSIGNMENT ─────────────────
      user_login_church_main_admin: {
        summary:
          '👤 USER LOGIN - Church Main Admin (Recommended for Role Assignment)',
        description:
          'Login as JOHN SMITH (person) who has church_main_admin role. Use this for role assignment APIs.',
        value: {
          email: 'admin@gracechurch.org',
          password: 'Password@123', // ← User's password
        },
      },
      user_login_pastor: {
        summary: '👤 USER LOGIN - Pastor',
        description: 'Login as Father Michael Anderson with pastor role.',
        value: {
          email: 'pastor@gracechurch.org',
          password: 'Password@123',
        },
      },
      user_login_assistant_pastor: {
        summary: '👤 USER LOGIN - Assistant Pastor',
        description: 'Login as Rev. Sarah Johnson with assistant pastor role.',
        value: {
          email: 'assistant-pastor@gracechurch.org',
          password: 'Password@123',
        },
      },
      user_login_church_leader: {
        summary: '👤 USER LOGIN - Church Leader',
        description: 'Login as Michael Chen with church leader role.',
        value: {
          email: 'leader@gracechurch.org',
          password: 'Password@123',
        },
      },
      user_login_background_checker: {
        summary: '👤 USER LOGIN - Background Checker',
        description: 'Login as Robert Wilson with background checker role.',
        value: {
          email: 'checker@gracechurch.org',
          password: 'Password@123',
        },
      },
      user_login_helper: {
        summary: '👤 USER LOGIN - Helper',
        description: 'Login as David Kim with helper role.',
        value: {
          email: 'helper@gracechurch.org',
          password: 'Password@123',
        },
      },
      user_login_member: {
        summary: '👤 USER LOGIN - Church Member',
        description: 'Login as Emily Rodriguez as church member.',
        value: {
          email: 'member@gracechurch.org',
          password: 'Password@123',
        },
      },
      user_login_verified_pro: {
        summary: '👤 USER LOGIN - Verified Professional',
        description: 'Login as James Wilson as verified professional.',
        value: {
          email: 'pro@gracechurch.org',
          password: 'Password@123',
        },
      },

      // ───────────────── CHURCH ORGANIZATION LOGIN ─────────────────
      church_login: {
        summary: '🏛️ CHURCH LOGIN - Grace Church (Organization)',
        description:
          'Login as the CHURCH ORGANIZATION itself. Use this for church-level settings, NOT for role assignment.',
        value: {
          email: 'admin@gracechurch.org',
          password: 'Church@2024', // ← Church's password
        },
      },

      // ───────────────── FAITH ASSEMBLY CHURCH USERS ─────────────────
      faith_user_login_main_admin: {
        summary: '👤 USER LOGIN - Faith Church Main Admin',
        description:
          'Login as Michael Johnson with church_main_admin role at Faith Assembly.',
        value: {
          email: 'admin@faithassembly.org',
          password: 'Password@123',
        },
      },
      faith_user_login_pastor: {
        summary: '👤 USER LOGIN - Faith Church Pastor',
        description: 'Login as Pastor David Williams at Faith Assembly.',
        value: {
          email: 'pastor@faithassembly.org',
          password: 'Password@123',
        },
      },
      faith_user_login_helper: {
        summary: '👤 USER LOGIN - Faith Church Helper',
        description: 'Login as Lisa Brown as helper at Faith Assembly.',
        value: {
          email: 'helper@faithassembly.org',
          password: 'Password@123',
        },
      },
      faith_user_login_member: {
        summary: '👤 USER LOGIN - Faith Church Member',
        description: 'Login as Mark Davis as member at Faith Assembly.',
        value: {
          email: 'member@faithassembly.org',
          password: 'Password@123',
        },
      },

      // ───────────────── SYSTEM ADMIN ─────────────────
      super_admin_login: {
        summary: '👑 SUPER ADMIN LOGIN',
        description: 'Login as system super administrator.',
        value: {
          email: appConfig().defaultUser.system.email || 'superadmin@gmail.com',
          password: appConfig().defaultUser.system.password || '12345678',
        },
      },

      // ───────────────── 2FA EXAMPLE ─────────────────
      two_factor_login: {
        summary: '🔐 Login with 2FA',
        description:
          'Example with 2FA token for users who have two-factor authentication enabled.',
        value: {
          email: 'user@example.com',
          password: 'password123',
          token: '123456',
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

  // User profile update endpoint
  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update user information and/or profile image. Image must be less than 5MB.',
  })
  @ApiBody({
    description: 'User data and optional image file',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        address: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        success: true,
        message: 'User updated successfully',
        data: { userId: 1 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file size or format',
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.updateUser(user_id, data, image);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email to user with OTP code',
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
    description: 'Reset email sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset email sent',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send email',
  })
  async forgotPassword(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.forgotPassword(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
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

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Reset user password using token from reset email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'token', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        token: { type: 'string' },
        password: { type: 'string', minLength: 8 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Body() data: { email: string; token: string; password: string },
  ) {
    try {
      const email = data.email;
      const token = data.token;
      const password = data.password;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.resetPassword({
        email: email,
        token: token,
        password: password,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  @Post('resend-token')
  @ApiOperation({
    summary: 'Resend password reset token',
    description: 'Resend OTP password reset token to email',
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
    description: 'Reset token resent successfully',
    schema: {
      example: {
        success: true,
        message: 'We have sent a token code to your email',
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
  async resendToken(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendToken(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to resend password reset token',
      };
    }
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
  @ApiOperation({
    summary: 'Register a new church',
    description:
      'Create a new church account with required details. Church email and name must be unique.',
  })
  @ApiBody({
    type: CreateChurchDto,
    description: 'Church registration data',
    examples: {
      church: {
        summary: 'Church Registration',
        value: {
          church_name: 'Grace Community Church',
          church_city: 'Dhaka',
          church_email: 'church@example.com',
          church_domain: 'grace-church',
          church_password: 'SecurePassword123',
          church_adminname: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Church registered successfully',
    schema: {
      example: {
        success: true,
        message: 'Church created successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Church email or name already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
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

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke refresh token and logout authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        success: true,
        message: 'Refresh token revoked successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or refresh token not found',
  })
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth login redirect',
    description: 'Redirect to Google OAuth 2.0 login flow',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth login',
  })
  async googleLogin(): Promise<any> {
    return HttpStatus.OK;
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Handle Google OAuth callback and return user data',
  })
  @ApiResponse({
    status: 200,
    description: 'Google OAuth successful',
    schema: {
      example: {
        statusCode: 200,
        data: {
          userId: 1,
          email: 'user@gmail.com',
          name: 'John Doe',
        },
      },
    },
  })
  async googleLoginRedirect(@Req() req: Request): Promise<any> {
    return {
      statusCode: HttpStatus.OK,
      data: req.user,
    };
  }

  /*=====================================================
                    Email Change Section
  =====================================================*/

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  @ApiOperation({
    summary: 'Request email change',
    description:
      'Request to change email address. Sends verification code to new email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'New email address',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email change request sent successfully',
    schema: {
      example: {
        success: true,
        message: 'We have sent an OTP code to your email',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or user not found',
  })
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      return await this.authService.requestEmailChange(user_id, data.email);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  @ApiOperation({
    summary: 'Change email address',
    description: 'Confirm email change with verification token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['new_email', 'token'],
      properties: {
        new_email: { type: 'string', format: 'email' },
        token: { type: 'string', description: 'OTP token sent to new email' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token or user not found',
  })
  async changeEmail(
    @Req() req: Request,
    @Body() data: { new_email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      return await this.authService.changeEmail({
        user_id,
        new_email: data.new_email,
        token: data.token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*=====================================================
                Two-Factor Authentication Section
  =====================================================*/

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  @ApiOperation({
    summary: 'Generate 2FA secret',
    description:
      'Generate a new 2FA secret for user. Returns QR code and backup codes.',
  })
  @ApiResponse({
    status: 200,
    description: '2FA secret generated successfully',
    schema: {
      example: {
        success: true,
        secret: 'JBSWY3DPEBLW64TMMQ======',
        qrCode: 'data:image/png;base64,...',
        backupCodes: ['123456', '234567', '345678'],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  @ApiOperation({
    summary: 'Verify 2FA token',
    description: 'Verify 2FA token to confirm setup or validate login',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: {
          type: 'string',
          description: 'OTP token from authenticator app',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '2FA verified successfully',
    schema: {
      example: {
        success: true,
        message: '2FA verified successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token',
  })
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      return await this.authService.verify2FA(user_id, data.token);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  @ApiOperation({
    summary: 'Enable 2FA for user',
    description: 'Enable two-factor authentication after verification',
  })
  @ApiResponse({
    status: 200,
    description: '2FA enabled successfully',
    schema: {
      example: {
        success: true,
        message: '2FA enabled successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or user not found',
  })
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth('super_admin-token')
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  @ApiOperation({
    summary: 'Disable 2FA for user',
    description: 'Disable two-factor authentication for user account',
  })
  @ApiResponse({
    status: 200,
    description: '2FA disabled successfully',
    schema: {
      example: {
        success: true,
        message: '2FA disabled successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or user not found',
  })
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
