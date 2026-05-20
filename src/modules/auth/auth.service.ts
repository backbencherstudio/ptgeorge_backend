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
import { ChurchStatus, UserStatus, UserType } from 'prisma/generated/enums';
import { CreateChurchDto } from './dto/create-church.dto';
import { ChurchLoginDto } from './dto/login-church.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UnifiedLoginDto } from './dto/create-user.dto';
import { Role } from 'src/common/guard/role/role.enum';

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

    if (!existingChurch) {
      throw new BadRequestException(
        `Church "${existingChurch.church_name}" not found or is not active. Please select a valid church from our platform.`,
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
      // Create the user with the church_id from the existing church
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
          church_id: existingChurch.id, // Link user to the church
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
      await tx.church.update({
        where: { id: existingChurch.id },
        data: { church_members: { increment: 1 } },
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

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles_assigned_to_me: {
          include: { role: true },
          where: { churchId: { not: null } },
          take: 1,
        },
        church: true, // Include church data for church admins
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

    // If user is CHURCH_ADMIN, check church status
    if (user.type === 'CHURCH_ADMIN' && user.church) {
      const churchStatus = user.church.status;

      switch (churchStatus) {
        case UserStatus.PENDING:
          throw new UnauthorizedException(
            'Your church registration is pending approval. Please wait for admin approval.',
          );
        case UserStatus.SUSPENDED:
          throw new UnauthorizedException(
            'Your church account has been suspended. Please contact support.',
          );
        case UserStatus.ACTIVE:
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
      church_id: user.church_id,
      church_status: user.church?.status,
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
        church_id: user.church_id,
      },
    };

    // Include church status in response for church admins
    if (user.type === 'CHURCH_ADMIN' && user.church) {
      responseData.church = {
        id: user.church.id,
        name: user.church.church_name,
        status: user.church.status,
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
      const data: any = {};

      if (updateUserDto.name) data.name = updateUserDto.name;

      if (updateUserDto.first_name) data.first_name = updateUserDto.first_name;

      if (updateUserDto.last_name) data.last_name = updateUserDto.last_name;

      if (updateUserDto.address) data.address = updateUserDto.address;

      if (updateUserDto.type) data.type = updateUserDto.type;

      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await TanvirStorage.delete(
            appConfig().storageUrl.avatar + '/' + oldImage.avatar,
          );
        }

        // upload file
        const fileName = `${StringHelper.randomString()}_${image.originalname}`;
        await TanvirStorage.put(
          appConfig().storageUrl.avatar + '/' + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }

      const user = await this.userRepository.getUserDetails(userId);
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });

        return {
          success: true,
          message: 'User updated successfully',
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
  async forgotPassword(email) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
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

  // done
  async resendToken(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          time: 2,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a token code to your email',
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

  async resetPassword({ email, token, password }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.verifycheckToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.userRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
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
      // Step 1: Create the church (ID auto-generated by Prisma)
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

      // Step 2: Create the church admin user (ID auto-generated by Prisma)
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
          church_id: church.id,
          email_verified_at: new Date(),
        },
      });

      // Step 3: Get or create the CHURCH_ADMIN role
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

      // Step 4: Assign the CHURCH_ADMIN role to the user
      await tx.roleUser.create({
        data: {
          role_id: churchAdminRole.id,
          user_id: churchAdminUser.id,
          churchId: church.id,
        },
      });

      // Step 5: Update church member count
      await tx.church.update({
        where: { id: church.id },
        data: { church_members: 1 },
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

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
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

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await this.userRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
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
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException('Token is required');
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await this.userRepository.generate2FASecret(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await this.userRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid token',
        };
      }
      return {
        success: true,
        message: '2FA verified successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.enable2FA(user_id);
        return {
          success: true,
          message: '2FA enabled successfully',
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

  async disable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.disable2FA(user_id);
        return {
          success: true,
          message: '2FA disabled successfully',
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
  // --------- end 2FA ---------
}
