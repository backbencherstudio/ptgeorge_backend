import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { CreateUserDto } from 'src/modules/auth/dto/create-user.dto';
import {
  ChurchMemberStatus,
  ChurchStatus,
  UserStatus,
  UserType,
} from 'prisma/generated/enums';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';
import { UpdateUserDto } from 'src/modules/auth/dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async createUserByAdmin(createUserDto: CreateUserDto, adminId: string) {
    const {
      first_name,
      last_name,
      phone_number,
      church_id,
      language,
      email,
      type,
      agree_to_terms,
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

    const DEFAULT_PASSWORD = 'Password@123';

    const password = createUserDto.password || DEFAULT_PASSWORD;
    const confirmPassword = createUserDto.confirm_password || password;

    // 1. Validate passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // 2. Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 3. Check if phone number already exists
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone_number },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // 4. Validate church exists
    const existingChurch = await this.prisma.church.findFirst({
      where: {
        id: church_id,
        status: ChurchStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!existingChurch) {
      throw new BadRequestException('Invalid or inactive church selected');
    }

    // 5. For PRO_USER, validate professional fields
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

      const existingBusinessEmail = await this.prisma.user.findFirst({
        where: { business_email },
      });

      if (existingBusinessEmail) {
        throw new ConflictException('Business email already registered');
      }
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create user with transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          first_name,
          last_name,
          phone_number,
          church_name: existingChurch.church_name,
          language,
          email,
          password: hashedPassword,
          type: type || UserType.USER,
          status: UserStatus.ACTIVE,
          email_verified_at: new Date(),
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
            other_locations: other_locations || null,
          }),
        },
      });

      await tx.churchMember.create({
        data: {
          church_id: existingChurch.id,
          user_id: user.id,
          church_role:
            type === UserType.PRO_USER
              ? 'Professional Member'
              : 'Regular Member',
          status: ChurchMemberStatus.ACTIVE,
          joined_at: new Date(),
        },
      });

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

      return { user, church: existingChurch };
    });

    return {
      success: true,
      message: `User ${type === UserType.PRO_USER ? 'professional account' : 'account'} created successfully`,
      data: {
        user_id: result.user.id,
        email: result.user.email,
        type: result.user.type,
        status: result.user.status,
        church: {
          id: result.church.id,
          name: result.church.church_name,
        },
      },
    };
  }

  async getAllUsers(
    currentUserId: string,
    filters: {
      church_id?: string;
      type?: UserType;
      status?: UserStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { church_id, type, status, search, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // Check if userId is provided
    if (!currentUserId) {
      throw new UnauthorizedException('User ID is required');
    }

    // Use findFirst instead of findUnique to include deleted_at filter
    const currentUser = await this.prisma.user.findFirst({
      where: {
        id: currentUserId,
        deleted_at: null,
      },
      include: {
        roles_assigned_to_me: { include: { role: true } },
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE, deleted_at: null },
          take: 1,
        },
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found or account deactivated');
    }

    const isSuperAdmin = currentUser.type === UserType.SUPER_ADMIN;
    const isAdmin = currentUser.type === UserType.ADMIN;
    const isChurchAdmin = currentUser.roles_assigned_to_me?.some(
      (r) => r.role?.name === 'CHURCH_ADMIN',
    );

    let effectiveChurchId = church_id;

    if (isChurchAdmin && !isSuperAdmin && !isAdmin && !effectiveChurchId) {
      const userChurch = currentUser.church_memberships[0];
      effectiveChurchId = userChurch?.church_id;
      if (!effectiveChurchId) {
        throw new ForbiddenException('You are not associated with any church');
      }
    }

    const where: any = { deleted_at: null };

    if (effectiveChurchId) {
      where.church_memberships = {
        some: { church_id: effectiveChurchId, deleted_at: null },
      };
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          roles_assigned_to_me: {
            include: {
              role: { select: { id: true, name: true, title: true } },
            },
            take: 1,
          },
          church_memberships: {
            where: effectiveChurchId
              ? { church_id: effectiveChurchId, deleted_at: null }
              : { deleted_at: null },
            include: { church: { select: { id: true, church_name: true } } },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => {
      const primaryRole = user.roles_assigned_to_me[0];
      const primaryMembership = user.church_memberships[0];

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone_number: user.phone_number,
        type: user.type,
        status: user.status,
        language: user.language,
        church_name: user.church_name,
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
        role: primaryRole?.role || null,
        church_membership: primaryMembership
          ? {
              id: primaryMembership.id,
              church_id: primaryMembership.church_id,
              church_name: primaryMembership.church?.church_name,
              status: primaryMembership.status,
              joined_at: primaryMembership.joined_at,
            }
          : null,
        ...(user.type === UserType.PRO_USER && {
          company_name: user.company_name,
          business_email: user.business_email,
          service: user.service,
          category: user.category,
        }),
      };
    });

    return {
      success: true,
      data: formattedUsers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      include: {
        church_memberships: {
          where: { deleted_at: null, status: ChurchMemberStatus.ACTIVE },
          include: {
            church: {
              select: { id: true, church_name: true, church_city: true },
            },
          },
          take: 1,
        },
        roles_assigned_to_me: {
          include: { role: { select: { id: true, name: true, title: true } } },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { success: true, data: user };
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (userId === adminId && dto.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('You cannot change your own status');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        status: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      message: `User status updated to ${dto.status}`,
      data: updated,
    };
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      include: {
        church_memberships: { take: 1 },
        roles_assigned_to_me: { include: { role: true }, take: 1 },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isSuperAdmin = await this.isSuperAdmin(adminId);
    const adminChurchId = await this.getAdminChurchId(adminId);

    if (!isSuperAdmin) {
      const userChurchId = user.church_memberships[0]?.church_id;
      if (userChurchId !== adminChurchId) {
        throw new ForbiddenException(
          'You can only update users from your church',
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update user basic info
      const updateData: any = {};
      if (updateUserDto.first_name)
        updateData.first_name = updateUserDto.first_name;
      if (updateUserDto.last_name)
        updateData.last_name = updateUserDto.last_name;
      if (updateUserDto.email) updateData.email = updateUserDto.email;
      if (updateUserDto.phone_number)
        updateData.phone_number = updateUserDto.phone_number;
      if (updateUserDto.language) updateData.language = updateUserDto.language;
      if (updateUserDto.type) updateData.type = updateUserDto.type;
      if (updateUserDto.status) updateData.status = updateUserDto.status;

      // Professional fields
      if (
        user.type === UserType.PRO_USER ||
        updateUserDto.type === UserType.PRO_USER
      ) {
        if (updateUserDto.company_name)
          updateData.company_name = updateUserDto.company_name;
        if (updateUserDto.business_email)
          updateData.business_email = updateUserDto.business_email;
        if (updateUserDto.business_phone)
          updateData.business_phone = updateUserDto.business_phone;
        if (updateUserDto.service) updateData.service = updateUserDto.service;
        if (updateUserDto.category)
          updateData.category = updateUserDto.category;
        if (updateUserDto.profession)
          updateData.profession = updateUserDto.profession;
        if (updateUserDto.website) updateData.website = updateUserDto.website;
        if (updateUserDto.whatsapp_number)
          updateData.whatsapp_number = updateUserDto.whatsapp_number;
        if (updateUserDto.available_time)
          updateData.available_time = updateUserDto.available_time;
        if (updateUserDto.address_line1)
          updateData.address_line1 = updateUserDto.address_line1;
        if (updateUserDto.address_line2)
          updateData.address_line2 = updateUserDto.address_line2;
        if (updateUserDto.state) updateData.state = updateUserDto.state;
        if (updateUserDto.country) updateData.country = updateUserDto.country;
        if (updateUserDto.zip_code)
          updateData.zip_code = updateUserDto.zip_code;
        if (updateUserDto.description)
          updateData.description = updateUserDto.description;
        if (updateUserDto.other_locations)
          updateData.other_locations = updateUserDto.other_locations;
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          type: true,
          status: true,
          language: true,
          company_name: true,
          business_email: true,
          service: true,
          category: true,
          updated_at: true,
        },
      });

      // 2. Update role if role_id is provided ✅ Fixed with optional chaining
      if (updateUserDto.role_id) {
        const newRole = await tx.role.findFirst({
          where: { id: updateUserDto.role_id, deleted_at: null },
        });

        if (!newRole) {
          throw new BadRequestException(
            `Role with ID "${updateUserDto.role_id}" not found`,
          );
        }

        const canAssign = await this.canAssignRole(adminId, newRole.id);
        if (!canAssign && !isSuperAdmin) {
          throw new ForbiddenException(
            `You cannot assign the role "${newRole.name}"`,
          );
        }

        const targetChurchId = updateUserDto.church_id || adminChurchId;

        // Remove existing role assignment
        await tx.roleUser.deleteMany({
          where: { user_id: userId, churchId: targetChurchId },
        });

        // Assign new role
        await tx.roleUser.create({
          data: {
            role_id: newRole.id,
            user_id: userId,
            assigned_by_id: adminId,
            churchId: targetChurchId,
          },
        });
      }

      // 3. Update church membership if church_id provided
      if (updateUserDto.church_id && isSuperAdmin) {
        const existingMembership = await tx.churchMember.findFirst({
          where: { user_id: userId, church_id: updateUserDto.church_id },
        });

        if (!existingMembership) {
          await tx.churchMember.create({
            data: {
              church_id: updateUserDto.church_id,
              user_id: userId,
              church_role: 'Member',
              status: ChurchMemberStatus.ACTIVE,
              joined_at: new Date(),
            },
          });
        }
      }

      return updatedUser;
    });

    return {
      success: true,
      message: 'User updated successfully',
      data: result,
    };
  }

  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      include: { church_memberships: { take: 1 } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isSuperAdmin = await this.isSuperAdmin(adminId);
    const adminChurchId = await this.getAdminChurchId(adminId);

    if (!isSuperAdmin) {
      const userChurchId = user.church_memberships[0]?.church_id;
      if (userChurchId !== adminChurchId) {
        throw new ForbiddenException(
          'You can only delete users from your church',
        );
      }
    }

    if (userId === adminId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete user
      await tx.user.update({
        where: { id: userId },
        data: { deleted_at: new Date(), status: UserStatus.SUSPENDED },
      });

      // Soft delete church memberships
      await tx.churchMember.updateMany({
        where: { user_id: userId },
        data: { deleted_at: new Date(), status: ChurchMemberStatus.REMOVED },
      });

      // Remove role assignments
      await tx.roleUser.deleteMany({
        where: { user_id: userId },
      });
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // Helper methods
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });
    return user?.type === UserType.SUPER_ADMIN;
  }

  private async getAdminChurchId(userId: string): Promise<string | undefined> {
    const membership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
      select: { church_id: true },
    });
    return membership?.church_id;
  }

  private async canAssignRole(
    userId: string,
    targetRoleId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles_assigned_to_me: { include: { role: true } } },
    });

    if (!user) return false;
    if (user.type === UserType.SUPER_ADMIN) return true;

    const userRoleIds = user.roles_assigned_to_me.map((ru) => ru.role_id);
    const rule = await this.prisma.roleAssignmentRule.findFirst({
      where: { from_role_id: { in: userRoleIds }, to_role_id: targetRoleId },
    });

    return !!rule;
  }
}
