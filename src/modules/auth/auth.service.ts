// external imports
import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

//internal imports
import { DateHelper } from '../../common/helper/date.helper';
import { StringHelper } from '../../common/helper/string.helper';
import { TanvirStorage } from '../../common/lib/Disk/TanvirStorage';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UserRepository } from '../../common/repository/user/user.repository';
import appConfig from '../../config/app.config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { verifyPassword } from 'src/common/utils/password.util';
import {
  ChurchStatus,
  UserStatus,
  UserType,
  ChurchMemberStatus,
} from 'prisma/generated/enums';
import { CreateChurchDto } from './dto/create-church.dto';
import { ChurchLoginDto } from './dto/login-church.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UnifiedLoginDto } from './dto/create-user.dto';
import { Role } from 'src/common/guard/role/role.enum';
import { ForgotPasswordDto, ResetPasswordDto, VerifyOtpDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  //
  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          address: true,
          type: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = TanvirStorage.url(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // done
  async register(createUserDto: CreateUserDto) {
    const {
      first_name,
      last_name,
      phone_number,
      church_id,
      language,
      email,
      password,
      confirm_password,
      type,
      agree_to_terms,
      // Professional fields
      company_name,
      business_email,
      business_phone,
      service,
      category,
      profession,
      website,
      whatsapp_number,
      available_time,
      address_line1,
      address_line2,
      state,
      country,
      zip_code,
      description,
      other_locations,
    } = createUserDto;

    // 1. Validate passwords match
    if (password !== confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    // 2. Validate terms agreement
    if (!agree_to_terms) {
      throw new BadRequestException(
        'You must agree to the terms and conditions, privacy policy, and community guidelines',
      );
    }

    // 3. Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 4. Check if phone number already exists
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone_number },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // 5. Validate that the church exists in the platform
    const existingChurch = await this.prisma.church.findFirst({
      where: {
        id: church_id,
        status: ChurchStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!existingChurch) {
      throw new BadRequestException(
        'Invalid or inactive church selected. Please select a valid church from our platform.',
      );
    }

    // 6. For PRO_USER, validate professional fields
    if (type === UserType.PRO_USER) {
      const requiredFields = [
        { field: company_name, name: 'company_name' },
        { field: business_email, name: 'business_email' },
        { field: business_phone, name: 'business_phone' },
        { field: service, name: 'service' },
        { field: category, name: 'category' },
        { field: profession, name: 'profession' },
        { field: available_time, name: 'available_time' },
        { field: address_line1, name: 'address_line1' },
        { field: state, name: 'state' },
        { field: country, name: 'country' },
        { field: zip_code, name: 'zip_code' },
        { field: description, name: 'description' },
      ];

      const missingFields = requiredFields.filter((f) => !f.field);
      if (missingFields.length > 0) {
        throw new BadRequestException(
          `Missing required professional fields: ${missingFields.map((f) => f.name).join(', ')}`,
        );
      }

      // Check if business email already exists
      const existingBusinessEmail = await this.prisma.user.findFirst({
        where: { business_email },
      });

      if (existingBusinessEmail) {
        throw new ConflictException('Business email already registered');
      }
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create user with transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the user (without church_id field)
      const user = await tx.user.create({
        data: {
          first_name,
          last_name,
          phone_number,
          church_name: existingChurch.church_name, // Use the exact church name from DB
          language,
          email,
          password: hashedPassword,
          type: type || UserType.USER,
          status: UserStatus.PENDING,
          email_verified_at: null,
          // Professional fields (only for PRO_USER)
          ...(type === UserType.PRO_USER && {
            company_name,
            business_email,
            business_phone,
            service,
            category,
            profession,
            website: website || null,
            whatsapp_number: whatsapp_number || null,
            available_time,
            address_line1,
            address_line2: address_line2 || null,
            state,
            country,
            zip_code,
            description,
          }),
        },
      });

      // Create church membership
      await tx.churchMember.create({
        data: {
          church_id: existingChurch.id,
          user_id: user.id,
          church_role:
            type === UserType.PRO_USER
              ? 'Professional Member'
              : 'Regular Member',
          status: ChurchMemberStatus.PENDING,
          joined_at: new Date(),
        },
      });

      // Create OTP for email verification
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await tx.ucode.create({
        data: {
          user_id: user.id,
          token: otpCode,
          email: email,
          expired_at: expiresAt,
        },
      });

      // Update church member count
      const memberCount = await tx.churchMember.count({
        where: {
          church_id: existingChurch.id,
          status: ChurchMemberStatus.ACTIVE,
          deleted_at: null,
        },
      });

      await tx.church.update({
        where: { id: existingChurch.id },
        data: { church_members: memberCount },
      });

      return { user, otpCode, church: existingChurch };
    });

    // 9. Send OTP email
    try {
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: `${first_name} ${last_name}`,
        otp: result.otpCode,
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
    }

    // 10. Return response
    return {
      success: true,
      message:
        type === UserType.PRO_USER
          ? 'Professional account created successfully. Please verify your email and wait for admin approval.'
          : 'Account created successfully. Please verify your email and wait for admin approval.',
      data: {
        user_id: result.user.id,
        email: result.user.email,
        type: result.user.type,
        status: result.user.status,
        church: {
          id: result.church.id,
          name: result.church.church_name,
          city: result.church.church_city,
        },
        requires_approval: true,
        requires_email_verification: true,
      },
    };
  }

  // done
  // In your auth.service.ts
  async unifiedLogin(loginDto: UnifiedLoginDto) {
    const { email, password, token } = loginDto;

    console.log(`[Login Attempt] Email: ${email}`);

    // Find user by email with their church memberships
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles_assigned_to_me: {
          include: { role: true },
          where: { churchId: { not: null } },
          take: 1,
        },
        church_memberships: {
          include: {
            church: true,
          },
          where: {
            status: ChurchMemberStatus.ACTIVE,
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log(`[User Found] Attempting login...`);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check email verification
    if (!user.email_verified_at) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is inactive');
    }

    // Get active church membership
    const activeMembership = user.church_memberships[0];
    const church = activeMembership?.church;

    // If user is CHURCH_ADMIN, check church status
    if (user.type === 'CHURCH_ADMIN' && church) {
      const churchStatus = church.status;

      switch (churchStatus) {
        case ChurchStatus.PENDING:
          throw new UnauthorizedException(
            'Your church registration is pending approval. Please wait for admin approval.',
          );
        case ChurchStatus.SUSPENDED:
          throw new UnauthorizedException(
            'Your church account has been suspended. Please contact support.',
          );
        case ChurchStatus.ACTIVE:
          // Church is active, allow login
          console.log(`[Church Status] Active - login allowed`);
          break;
        default:
          throw new UnauthorizedException(
            'Unable to login due to church account status issue.',
          );
      }
    }

    // Check 2FA if enabled
    if (user.is_two_factor_enabled === 1) {
      if (!token) {
        throw new UnauthorizedException('2FA token required');
      }
      // TODO: Verify 2FA token
    }

    const currentRole = user.roles_assigned_to_me[0]?.role;

    console.log(
      `[Login Success] ${user.email} as ${currentRole?.title || user.type}`,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      userId: user.id,
      type: user.type,
      role: currentRole?.name || user.type.toLowerCase(),
      church_id: church?.id || null,
      church_status: church?.status || null,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      60 * 60 * 24 * 7,
    );

    // Prepare response data
    const responseData: any = {
      type: user.type,
      role: currentRole?.title || user.type,
      role_name: currentRole?.name || user.type.toLowerCase(),
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        church_id: church?.id || null,
      },
    };

    // Include church status in response for church admins
    if (user.type === 'CHURCH_ADMIN' && church) {
      responseData.church = {
        id: church.id,
        name: church.church_name,
        status: church.status,
      };
    }

    return {
      success: true,
      message: 'Logged in successfully',
      data: responseData,
      authorization: {
        type: 'Bearer',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
      },
    };
  }

  // update user
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId, deleted_at: null },
      });

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Prepare update data
      const data: any = {};

      // Personal information
      if (updateUserDto.first_name) data.first_name = updateUserDto.first_name;
      if (updateUserDto.last_name) data.last_name = updateUserDto.last_name;
      if (updateUserDto.address_line1)
        data.address_line1 = updateUserDto.address_line1;
      if (updateUserDto.address_line2)
        data.address_line2 = updateUserDto.address_line2;
      if (updateUserDto.phone_number)
        data.phone_number = updateUserDto.phone_number;
      if (updateUserDto.language) data.language = updateUserDto.language;

      // Professional information (if PRO_USER)
      if (existingUser.type === 'PRO_USER') {
        if (updateUserDto.company_name)
          data.company_name = updateUserDto.company_name;
        if (updateUserDto.business_email)
          data.business_email = updateUserDto.business_email;
        if (updateUserDto.business_phone)
          data.business_phone = updateUserDto.business_phone;
        if (updateUserDto.service) data.service = updateUserDto.service;
        if (updateUserDto.category) data.category = updateUserDto.category;
        if (updateUserDto.profession)
          data.profession = updateUserDto.profession;
        if (updateUserDto.website) data.website = updateUserDto.website;
        if (updateUserDto.whatsapp_number)
          data.whatsapp_number = updateUserDto.whatsapp_number;
        if (updateUserDto.available_time)
          data.available_time = updateUserDto.available_time;
        if (updateUserDto.address_line1)
          data.address_line1 = updateUserDto.address_line1;
        if (updateUserDto.address_line2)
          data.address_line2 = updateUserDto.address_line2;
        if (updateUserDto.state) data.state = updateUserDto.state;
        if (updateUserDto.country) data.country = updateUserDto.country;
        if (updateUserDto.zip_code) data.zip_code = updateUserDto.zip_code;
        if (updateUserDto.description)
          data.description = updateUserDto.description;
      }

      // Handle image upload
      if (image) {
        // Validate file type
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/webp',
        ];
        if (!allowedMimes.includes(image.mimetype)) {
          return {
            success: false,
            message:
              'Invalid file type. Only JPEG, PNG, and WEBP images are allowed.',
          };
        }

        // Validate file size (5MB)
        if (image.size > 5 * 1024 * 1024) {
          return {
            success: false,
            message: 'Image size must be less than 5MB',
          };
        }

        // Delete old image from storage if exists
        if (existingUser.avatar) {
          try {
            await TanvirStorage.delete(
              appConfig().storageUrl.avatar + '/' + existingUser.avatar,
            );
          } catch (deleteError) {
            console.error('Failed to delete old avatar:', deleteError);
            // Continue even if delete fails
          }
        }

        // Generate unique filename and upload
        const fileExtension = image.originalname.split('.').pop();
        const fileName = `${StringHelper.randomString()}_${Date.now()}.${fileExtension}`;

        await TanvirStorage.put(
          appConfig().storageUrl.avatar + '/' + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          updated_at: new Date(),
        },
        select: {
          id: true,
          name: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          address: true,
          avatar: true,
          language: true,
          type: true,
          status: true,
          updated_at: true,
        },
      });

      // Add avatar URL to response
      const responseData = {
        ...updatedUser,
        avatar_url: updatedUser.avatar
          ? TanvirStorage.url(
              appConfig().storageUrl.avatar + '/' + updatedUser.avatar,
            )
          : null,
      };

      return {
        success: true,
        message: 'User updated successfully',
        data: responseData,
      };
    } catch (error: any) {
      console.error('Update user error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update user',
      };
    }
  }

  // done
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (!user) {
        return {
          success: false,
          message: 'Email not found',
        };
      }

      // Delete any existing unused OTPs for this email
      await this.ucodeRepository.deleteExpiredTokens(email);

      // Create new OTP token
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.prisma.ucode.create({
        data: {
          user_id: user.id,
          token: otpCode,
          email: email,
          expired_at: expiresAt,
          status: 1,
        },
      });

      // Send OTP email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: user.first_name || user.name || 'User',
        otp: otpCode,
      });

      return {
        success: true,
        message: 'OTP sent to your email. It will expire in 10 minutes.',
        data: {
          email: email,
          expires_in: 600, // 10 minutes in seconds
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send OTP',
      };
    }
  }

  async verifyResetOtp(verifyOtpDto: VerifyOtpDto) {
    try {
      const { email, otp } = verifyOtpDto;

      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (!user) {
        return {
          success: false,
          message: 'Email not found',
        };
      }

      // Validate OTP
      const validOtp = await this.ucodeRepository.verifyToken({
        email: email,
        token: otp,
      });

      if (!validOtp || !validOtp.success) {
        return {
          success: false,
          message: validOtp?.message || 'Invalid or expired OTP',
        };
      }

      // Generate a secure reset token (JWT or random string)
      const resetToken = StringHelper.randomString(32) + Date.now();

      // Store reset token in Redis with 15 minutes expiry
      await this.redis.setex(
        `password_reset:${email}`,
        900, // 15 minutes
        resetToken,
      );

      // Mark OTP as used
      await this.ucodeRepository.deleteToken({
        email: email,
        token: otp,
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        data: {
          reset_token: resetToken,
          email: email,
          expires_in: 900,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to verify OTP',
      };
    }
  }

  // done
  async verifyToken({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const result = await this.ucodeRepository.verifyToken({
          email: email,
          token: token,
        });

        // Check the actual success property, not just if object exists
        if (result && result.success) {
          return {
            success: true,
            message: result.message || 'Token verified successfully',
          };
        } else {
          return {
            success: false,
            message: result?.message || 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Forgot password - Step 3: Reset password using reset token
  async resetPasswordWithToken(resetPasswordDto: ResetPasswordDto) {
    try {
      const { email, reset_token, new_password, confirm_password } =
        resetPasswordDto;

      // Validate passwords match
      if (new_password !== confirm_password) {
        return {
          success: false,
          message: 'Passwords do not match',
        };
      }

      // Validate password strength
      if (new_password.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters',
        };
      }

      // Check if user exists
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (!user) {
        return {
          success: false,
          message: 'Email not found',
        };
      }

      // Verify reset token from Redis
      const storedToken = await this.redis.get(`password_reset:${email}`);

      if (!storedToken || storedToken !== reset_token) {
        return {
          success: false,
          message: 'Invalid or expired reset token. Please request a new OTP.',
        };
      }

      // Update password
      await this.userRepository.changePassword({
        email: email,
        password: new_password,
      });

      // Delete the used reset token
      await this.redis.del(`password_reset:${email}`);

      // // Send password change confirmation email
      // try {
      //   await this.mailService.sendPasswordChangedEmail({
      //     email: email,
      //     name: user.first_name || user.name || 'User',
      //   });
      // } catch (emailError) {
      //   console.error(
      //     'Failed to send password change confirmation:',
      //     emailError,
      //   );
      //   // Don't fail the request if email fails
      // }

      return {
        success: true,
        message:
          'Password changed successfully. You can now login with your new password.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to reset password',
      };
    }
  }

  async resendToken(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        return {
          success: false,
          message: 'Email not found',
        };
      }

      // Delete existing unused OTPs
      await this.ucodeRepository.deleteExpiredTokens(email);

      // Create new OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.prisma.ucode.create({
        data: {
          user_id: user.id,
          token: otpCode,
          email: email,
          expired_at: expiresAt,
          status: 1,
        },
      });

      // Send OTP email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: user.first_name || user.name || 'User',
        otp: otpCode,
      });

      return {
        success: true,
        message: 'New OTP sent to your email',
        data: {
          email: email,
          expires_in: 600,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  //done
  async verifyEmail({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async resendVerificationEmail(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await this.userRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await this.userRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*=====================================================
                      Church Section  Start
  =====================================================*/

  async createChurch(createChurchDto: CreateChurchDto) {
    const {
      church_name,
      church_city,
      church_email,
      church_domain,
      church_password,
      church_adminname,
      status = 'PENDING',
      auth_type = 'CHURCH_ADMIN',
    } = createChurchDto;

    // Check if church email already exists
    const churchEmailExist = await this.prisma.church.findFirst({
      where: { church_email },
    });

    if (churchEmailExist) {
      throw new ConflictException('Church email already exists');
    }

    // Check if church domain already exists
    const churchDomainExist = await this.prisma.church.findFirst({
      where: { church_domain },
    });

    if (churchDomainExist) {
      throw new ConflictException('Church domain already exists');
    }

    // Check if church name already exists
    const churchNameExist = await this.prisma.church.findFirst({
      where: { church_name },
    });

    if (churchNameExist) {
      throw new ConflictException('Church name already exists');
    }

    // Check if user with same email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: church_email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(church_password, 10);

    // Create Church and Church Admin User in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1: Create the church
      const church = await tx.church.create({
        data: {
          church_name,
          church_city,
          church_email,
          church_domain,
          church_adminname,
          status: status as any,
          auth_type: auth_type as any,
          church_members: 0,
        },
      });

      // Step 2: Create the church admin user (without church_id)
      const churchAdminUser = await tx.user.create({
        data: {
          first_name: church_adminname.split(' ')[0] || church_adminname,
          last_name: church_adminname.split(' ')[1] || '',
          email: church_email,
          password: hashedPassword,
          phone_number: '',
          church_name: church_name,
          language: 'en',
          type: Role.CHURCH_ADMIN,
          status: UserStatus.ACTIVE,
          email_verified_at: new Date(),
        },
      });

      // Step 3: Create church membership for admin
      await tx.churchMember.create({
        data: {
          church_id: church.id,
          user_id: churchAdminUser.id,
          church_role: 'Church Admin',
          status: ChurchMemberStatus.ACTIVE,
          joined_at: new Date(),
          approved_at: new Date(),
        },
      });

      // Step 4: Get or create the CHURCH_ADMIN role
      let churchAdminRole = await tx.role.findFirst({
        where: { name: Role.CHURCH_ADMIN },
      });

      if (!churchAdminRole) {
        churchAdminRole = await tx.role.create({
          data: {
            name: Role.CHURCH_ADMIN,
            title: 'Church Admin',
            description:
              'Church administrator with full control over church management',
            status: 1,
            color: '#FF8C00',
          },
        });
      }

      // Step 5: Assign the CHURCH_ADMIN role to the user
      await tx.roleUser.create({
        data: {
          role_id: churchAdminRole.id,
          user_id: churchAdminUser.id,
          churchId: church.id,
        },
      });

      // Step 6: Update church member count
      const memberCount = await tx.churchMember.count({
        where: {
          church_id: church.id,
          status: ChurchMemberStatus.ACTIVE,
          deleted_at: null,
        },
      });

      await tx.church.update({
        where: { id: church.id },
        data: { church_members: memberCount },
      });

      return { church, churchAdminUser };
    });

    // Return response without sensitive data
    return {
      success: true,
      message:
        'Church created successfully. Church admin user has been created.',
      data: {
        church: {
          id: result.church.id,
          name: result.church.church_name,
          email: result.church.church_email,
          domain: result.church.church_domain,
          city: result.church.church_city,
          status: result.church.status,
        },
        admin_user: {
          id: result.churchAdminUser.id,
          email: result.churchAdminUser.email,
          name: `${result.churchAdminUser.first_name} ${result.churchAdminUser.last_name}`,
          type: result.churchAdminUser.type,
        },
      },
    };
  }

  // ---------------------------------(end)---------------------------------------

  async refreshToken(user_id: string, refreshToken: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);

      if (!storedToken || storedToken != refreshToken) {
        return {
          success: false,
          message: 'Refresh token is required',
        };
      }

      if (!user_id) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userDetails = await this.userRepository.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const payload = {
        email: userDetails.email,
        sub: userDetails.id,
        type: userDetails.type,
      };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        success: true,
        authorization: {
          type: 'bearer',
          access_token: accessToken,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async revokeRefreshToken(user_id: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);
      if (!storedToken) {
        return {
          success: false,
          message: 'Refresh token not found',
        };
      }

      await this.redis.del(`refresh_token:${user_id}`);

      return {
        success: true,
        message: 'Refresh token revoked successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        // Check if email is verified
        if (!user.email_verified_at) {
          throw new UnauthorizedException(
            'Please verify your email before logging in',
          );
        }
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await this.userRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException('Invalid token');
            }
          } else {
            throw new UnauthorizedException('Token is required');
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
      }
    } else {
      throw new UnauthorizedException('Email not found');
    }
  }
}
