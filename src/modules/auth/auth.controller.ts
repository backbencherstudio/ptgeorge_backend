import {
  Body,
  Controller,
  Get,
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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { LocalAuthGuard } from 'src/modules/auth/guards/local-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateChurchDto } from './dto/create-church.dto';
import { ChurchLoginDto } from './dto/login-church.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // *get user details
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

  // *register user
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

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  async login(
    @Req() req: Request & { user: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    const user_id = req.user.id;
    const user_email = req.user.email;

    const response = await this.authService.login({
      userId: user_id,
      email: user_email,
    });

    res.cookie('refresh_token', response.authorization.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return response;
  }

  // *update user
  @UseGuards(JwtAuthGuard)
  @Patch('update')
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

  // *forgot password
  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
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

  // *verify email
  @ApiOperation({ summary: 'Verify email' })
  @Post('verify-email')
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

  // *resend verification email to verify the email
  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
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

  // *reset password if user forget the password
  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
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

  // *resend token
  @ApiOperation({ summary: 'Resend reset password token' })
  @Post('resend-token')
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

  // *veify token
  @ApiOperation({ summary: 'Verify reset password token' })
  @Post('verify-token')
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

  // change password if user want to change the password
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
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
        // email: email,
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

  // add new church
  @Post('church/register')
  async createChurch(@Body() dto: CreateChurchDto) {
    try {
      const church_name = dto.church_name;
      const church_city = dto.church_city;
      const church_email = dto.church_email;
      const church_domain = dto.church_domain;
      const church_password = dto.church_password;
      const church_adminname = dto.church_adminname;
      const status = dto.status;
      const auth_type = dto.auth_type;

      if (!church_name) {
        throw new HttpException(
          'Church name not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!church_city) {
        throw new HttpException(
          'Church city not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!church_email) {
        throw new HttpException(
          'Church email not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!church_domain) {
        throw new HttpException(
          'Church domain not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!church_password) {
        throw new HttpException(
          'Church password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const response = await this.authService.createChurch(
        church_name,
        church_city,
        church_email,
        church_domain,
        church_password,
        church_adminname,
        status,
        auth_type,
      );

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // church auth
  @Post('church/login')
  async churchLogin(@Body() dto: ChurchLoginDto) {
    try {
      const church_email = dto.church_email;
      const church_password = dto.church_password;

      if (!church_email) {
        throw new HttpException(
          'Church email not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!church_password) {
        throw new HttpException(
          'Church password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const response = await this.authService.churchLogin(
        church_email,
        church_password,
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  //-----------------------------------------------(end)----------------------------------------------------------------------

  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
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
  async googleLogin(): Promise<any> {
    return HttpStatus.OK;
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleLoginRedirect(@Req() req: Request): Promise<any> {
    return {
      statusCode: HttpStatus.OK,
      data: req.user,
    };
  }
}
