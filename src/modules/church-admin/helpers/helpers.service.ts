// helpers.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserStatus, ChurchMemberStatus } from 'prisma/generated/client';
import { Role as RoleEnum } from 'src/common/guard/role/role.enum';
import { CreateHelperDto, UpdateHelperDto } from './dto/helper.dto';
import appConfig from 'src/config/app.config';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';

@Injectable()
export class HelpersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserChurch(userId: string) {
    const church = await this.prisma.church.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        church_name: true,
        church_city: true,
      },
    });

    if (!church) {
      throw new NotFoundException(
        'No church found associated with this admin account.',
      );
    }

    return church;
  }

  private async getHelperRoleId() {
    const role = await this.prisma.role.findFirst({
      where: { name: RoleEnum.HELPER },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException('HELPER role not found in system');
    }

    return role.id;
  }

  private async getChurchMemberRoleId() {
    const role = await this.prisma.role.findFirst({
      where: { name: RoleEnum.CHURCH_MEMBER },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException('CHURCH_MEMBER role not found in system');
    }

    return role.id;
  }

  private async isHelperInChurch(churchId: string, userId: string) {
    const roleAssignment = await this.prisma.roleUser.findFirst({
      where: {
        user_id: userId,
        churchId: churchId,
        role: {
          name: RoleEnum.HELPER,
        },
      },
    });

    return !!roleAssignment;
  }

  private async createAuditLog(
    actorId: string,
    action: string,
    target: string,
    churchId: string,
    churchName: string,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { first_name: true, last_name: true, type: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actor: actor
          ? `${actor.first_name} ${actor.last_name}`
          : 'Unknown User',
        action: action,
        target: target,
        church: churchName || '--',
        actor_id: actorId,
        actor_type: actor?.type || 'USER',
        church_id: churchId,
      },
    });
  }

  private generateRandomPassword() {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  private async uploadAvatar(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<string> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.originalname}. Only JPEG, PNG, JPG, WEBP are allowed`,
      );
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `avatar_${userId || Date.now()}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await TanvirStorage.put(
      `${appConfig().storageUrl.avatar}/${fileName}`,
      file.buffer,
    );

    return `${appConfig().storageUrl.avatar}/${fileName}`;
  }

  private async uploadPortfolioImages(
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const urls: string[] = [];
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
    ];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.originalname}. Only JPEG, PNG, JPG, WEBP are allowed`,
        );
      }

      const fileExtension = file.originalname.split('.').pop();
      const fileName = `portfolio_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

      await TanvirStorage.put(
        `${appConfig().storageUrl.portfolio}/${fileName}`,
        file.buffer,
      );

      urls.push(`${appConfig().storageUrl.portfolio}/${fileName}`);
    }
    return urls;
  }

  private async deleteAvatar(imageUrl: string): Promise<void> {
    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await TanvirStorage.delete(
          `${appConfig().storageUrl.avatar}/${fileName}`,
        );
      }
    } catch (error) {
      console.error('Failed to delete avatar:', error);
    }
  }

  private async deletePortfolioImage(imageUrl: string): Promise<void> {
    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await TanvirStorage.delete(
          `${appConfig().storageUrl.portfolio}/${fileName}`,
        );
      }
    } catch (error) {
      console.error('Failed to delete portfolio image:', error);
    }
  }

  async getAllHelpers(
    adminUserId: string,
    filters: {
      search?: string;
      status?: UserStatus;
      memberStatus?: ChurchMemberStatus;
      page?: number;
      limit?: number;
      fields?: string[];
    } = {},
  ) {
    const {
      search,
      status,
      memberStatus,
      page = 1,
      limit = 10,
      fields,
    } = filters;

    const skip = (page - 1) * limit;

    // Get admin's church
    const church = await this.getUserChurch(adminUserId);
    const helperRoleId = await this.getHelperRoleId();

    // Build the where condition for role assignments
    let whereCondition: any = {
      role_id: helperRoleId,
      churchId: church.id,
    };

    // Add search filter
    if (search) {
      whereCondition = {
        ...whereCondition,
        user: {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone_number: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

    // Add user status filter
    if (status) {
      whereCondition = {
        ...whereCondition,
        user: {
          ...whereCondition.user,
          status: status,
        },
      };
    }

    // Add church member status filter
    if (memberStatus) {
      whereCondition = {
        ...whereCondition,
        user: {
          ...whereCondition.user,
          church_memberships: {
            some: {
              church_id: church.id,
              status: memberStatus,
            },
          },
        },
      };
    }

    // Get role assignments with pagination
    const [roleAssignments, total] = await Promise.all([
      this.prisma.roleUser.findMany({
        where: whereCondition,
        include: {
          user: {
            include: {
              church_memberships: {
                where: {
                  church_id: church.id,
                },
                take: 1,
              },
              skills: {
                select: { skill_name: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.roleUser.count({ where: whereCondition }),
    ]);

    // Format helpers with detailed information
    const helpersWithDetails = roleAssignments.map((assignment) => {
      const user = assignment.user;
      const churchMembership = user.church_memberships?.[0];

      // Build full helper data
      const fullHelperData = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        avatar: user.avatar,
        availability: user.availability,
        profession: user.profession
      };

      // If fields are specified, only return requested fields
      if (fields && fields.length > 0) {
        const filteredData: any = {};
        fields.forEach((field) => {
          if (field in fullHelperData) {
            filteredData[field] = fullHelperData[field];
          }
        });
        return filteredData;
      }

      return fullHelperData;
    });

    return {
      status: 200,
      message: 'Helpers retrieved successfully',
      data: {
        helpers: helpersWithDetails,
        church: {
          id: church.id,
          name: church.church_name,
          city: church.church_city,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getHelperById(adminUserId: string, helperId: string) {
    const church = await this.getUserChurch(adminUserId);

    const isHelper = await this.isHelperInChurch(church.id, helperId);
    if (!isHelper) {
      throw new ForbiddenException('User is not a helper in your church');
    }

    const churchMember = await this.prisma.churchMember.findFirst({
      where: {
        church_id: church.id,
        user_id: helperId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!churchMember) {
      throw new NotFoundException('Helper not found in this church');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: helperId },
      include: {
        skills: {
          select: { skill_name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [postsCount, commentsCount, reactionsCount] = await Promise.all([
      this.prisma.churchPost.count({
        where: {
          church_id: church.id,
          church_member_id: churchMember.id,
          deleted_at: null,
        },
      }),
      this.prisma.churchComment.count({
        where: {
          post: { church_id: church.id },
          church_member_id: churchMember.id,
          deleted_at: null,
        },
      }),
      this.prisma.churchPostReact.count({
        where: {
          post: { church_id: church.id },
          church_member_id: churchMember.id,
        },
      }),
    ]);

    const recentActivities = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { actor_id: helperId, church_id: church.id },
          {
            target: { contains: user.first_name, mode: 'insensitive' },
            church_id: church.id,
          },
        ],
      },
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        action: true,
        target: true,
        created_at: true,
      },
    });

    return {
      status: 200,
      message: 'Helper details retrieved successfully',
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        avatar: user.avatar,
        about_me: user.about_me,
        availability: user.availability,
        skills: user.skills.map((s) => s.skill_name),
        portfolio_images: user.portfolio_images,
        address: user.address,
        city: user.city,
        state: user.state,
        zip_code: user.zip_code,
        country: user.country,
        gender: user.gender,
        date_of_birth: user.date_of_birth,
        bio: user.bio,
        joined_at: churchMember.joined_at,
        created_at: user.created_at,
        stats: {
          posts_count: postsCount,
          comments_count: commentsCount,
          reactions_count: reactionsCount,
        },
        recent_activities: recentActivities.map((a) => ({
          action: a.action,
          target: a.target,
          created_at: a.created_at,
        })),
      },
    };
  }

  async createHelper(
    adminUserId: string,
    dto: CreateHelperDto,
    avatarFile?: Express.Multer.File,
    portfolioFiles?: Express.Multer.File[],
  ) {
    const church = await this.getUserChurch(adminUserId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.password && dto.password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const password = dto.password || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    let avatarUrl: string | undefined;
    if (avatarFile) {
      avatarUrl = await this.uploadAvatar(avatarFile);
    }

    let portfolioImageUrls: string[] = [];
    if (portfolioFiles && portfolioFiles.length > 0) {
      portfolioImageUrls = await this.uploadPortfolioImages(portfolioFiles);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email,
          phone_number: dto.phone_number,
          church_name: church.church_name,
          language: dto.language || 'en',
          type: 'USER',
          status: UserStatus.ACTIVE,
          password: hashedPassword,
          email_verified_at: new Date(),
          about_me: dto.about_me,
          availability: dto.availability,
          avatar: avatarUrl,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          zip_code: dto.zip_code,
          country: dto.country,
          gender: dto.gender,
          date_of_birth: dto.date_of_birth
            ? new Date(dto.date_of_birth)
            : undefined,
          bio: dto.bio,
          portfolio_images: portfolioImageUrls,
          company_name: dto.company_name,
          business_email: dto.business_email,
          business_phone: dto.business_phone,
          service: dto.service,
          category: dto.category,
          profession: dto.profession,
          website: dto.website,
          whatsapp_number: dto.whatsapp_number,
          available_time: dto.available_time,
          address_line1: dto.address_line1,
          address_line2: dto.address_line2,
          description: dto.description,
        },
      });

      const churchMember = await tx.churchMember.create({
        data: {
          church_id: church.id,
          user_id: newUser.id,
          church_role: 'Helper',
          status: ChurchMemberStatus.ACTIVE,
          joined_at: new Date(),
          approved_by: adminUserId,
          approved_at: new Date(),
        },
      });

      const helperRoleId = await this.getHelperRoleId();
      await tx.roleUser.create({
        data: {
          user_id: newUser.id,
          role_id: helperRoleId,
          assigned_by_id: adminUserId,
          churchId: church.id,
        },
      });

      if (dto.skills && dto.skills.length > 0) {
        await tx.skills.createMany({
          data: dto.skills.map((skill) => ({
            skill_name: skill,
            user_id: newUser.id,
          })),
        });
      }

      await tx.church.update({
        where: { id: church.id },
        data: { church_members: { increment: 1 } },
      });

      return { newUser, churchMember };
    });

    await this.createAuditLog(
      adminUserId,
      'ADDED_HELPER',
      `${dto.first_name} ${dto.last_name} → Helper`,
      church.id,
      church.church_name,
    );

    const skills = await this.prisma.skills.findMany({
      where: { user_id: result.newUser.id },
      select: { skill_name: true },
    });

    return {
      status: 201,
      message: 'Helper created successfully',
      data: {
        id: result.newUser.id,
        first_name: result.newUser.first_name,
        last_name: result.newUser.last_name,
        email: result.newUser.email,
        phone_number: result.newUser.phone_number,
        avatar: result.newUser.avatar,
        about_me: result.newUser.about_me,
        availability: result.newUser.availability,
        skills: skills.map((s) => s.skill_name),
        portfolio_images: result.newUser.portfolio_images,
        church_role: 'Helper',
        joined_at: result.churchMember.joined_at,
        created_at: result.newUser.created_at,
      },
      password: dto.password ? undefined : password,
    };
  }

  async updateHelper(
    adminUserId: string,
    helperId: string,
    dto: UpdateHelperDto,
    avatarFile?: Express.Multer.File,
    portfolioFiles?: Express.Multer.File[],
  ) {
    const church = await this.getUserChurch(adminUserId);

    const isHelper = await this.isHelperInChurch(church.id, helperId);
    if (!isHelper) {
      throw new ForbiddenException('User is not a helper in your church');
    }

    const churchMember = await this.prisma.churchMember.findFirst({
      where: {
        church_id: church.id,
        user_id: helperId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!churchMember) {
      throw new NotFoundException('Helper not found in this church');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: helperId },
      select: { avatar: true, portfolio_images: true },
    });

    // Handle avatar upload
    let avatarUrl: string | undefined;
    if (avatarFile) {
      if (existingUser?.avatar) {
        await this.deleteAvatar(existingUser.avatar);
      }
      avatarUrl = await this.uploadAvatar(avatarFile, helperId);
    }

    // Handle portfolio images
    let currentPortfolio: string[] = [];
    if (existingUser?.portfolio_images) {
      currentPortfolio = Array.isArray(existingUser.portfolio_images)
        ? [...existingUser.portfolio_images]
        : [];
    }

    // Delete specified portfolio images
    if (dto.delete_portfolio_images && dto.delete_portfolio_images.length > 0) {
      for (const imageUrl of dto.delete_portfolio_images) {
        currentPortfolio = currentPortfolio.filter((img) => img !== imageUrl);
        await this.deletePortfolioImage(imageUrl);
      }
    }

    // Add new portfolio images
    let newPortfolioUrls: string[] = [];
    if (portfolioFiles && portfolioFiles.length > 0) {
      newPortfolioUrls = await this.uploadPortfolioImages(portfolioFiles);
      currentPortfolio = [...currentPortfolio, ...newPortfolioUrls];
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: helperId },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
        language: dto.language,
        about_me: dto.about_me,
        availability: dto.availability,
        avatar: avatarUrl !== undefined ? avatarUrl : undefined,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip_code: dto.zip_code,
        country: dto.country,
        gender: dto.gender,
        date_of_birth: dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : undefined,
        bio: dto.bio,
        portfolio_images: currentPortfolio,
        company_name: dto.company_name,
        business_email: dto.business_email,
        business_phone: dto.business_phone,
        service: dto.service,
        category: dto.category,
        profession: dto.profession,
        website: dto.website,
        whatsapp_number: dto.whatsapp_number,
        available_time: dto.available_time,
        address_line1: dto.address_line1,
        address_line2: dto.address_line2,
        description: dto.description,
      },
    });

    // Handle skills update
    if (dto.skills) {
      await this.prisma.skills.deleteMany({
        where: { user_id: helperId },
      });

      if (dto.skills.length > 0) {
        await this.prisma.skills.createMany({
          data: dto.skills.map((skill) => ({
            skill_name: skill,
            user_id: helperId,
          })),
        });
      }
    }

    const skills = await this.prisma.skills.findMany({
      where: { user_id: helperId },
      select: { skill_name: true },
    });

    await this.createAuditLog(
      adminUserId,
      'UPDATED_HELPER',
      `${updatedUser.first_name} ${updatedUser.last_name}`,
      church.id,
      church.church_name,
    );

    return {
      status: 200,
      message: 'Helper updated successfully',
      data: {
        id: updatedUser.id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
        avatar: updatedUser.avatar,
        about_me: updatedUser.about_me,
        availability: updatedUser.availability,
        skills: skills.map((s) => s.skill_name),
        portfolio_images: updatedUser.portfolio_images,
        church_role: churchMember.church_role,
        joined_at: churchMember.joined_at,
        created_at: updatedUser.created_at,
      },
    };
  }

  async removeHelperRole(adminUserId: string, helperId: string) {
    const church = await this.getUserChurch(adminUserId);

    const isHelper = await this.isHelperInChurch(church.id, helperId);
    if (!isHelper) {
      throw new ForbiddenException('User is not a helper in your church');
    }

    const churchMember = await this.prisma.churchMember.findFirst({
      where: {
        church_id: church.id,
        user_id: helperId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!churchMember) {
      throw new NotFoundException('Helper not found in this church');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: helperId },
      select: { first_name: true, last_name: true, email: true },
    });

    const churchMemberRoleId = await this.getChurchMemberRoleId();

    await this.prisma.$transaction(async (tx) => {
      await tx.roleUser.deleteMany({
        where: {
          user_id: helperId,
          churchId: church.id,
          role: {
            name: RoleEnum.HELPER,
          },
        },
      });

      await tx.roleUser.create({
        data: {
          user_id: helperId,
          role_id: churchMemberRoleId,
          assigned_by_id: adminUserId,
          churchId: church.id,
        },
      });

      await tx.churchMember.update({
        where: { id: churchMember.id },
        data: { church_role: 'Member' },
      });
    });

    const targetName = user ? `${user.first_name} ${user.last_name}` : helperId;
    await this.createAuditLog(
      adminUserId,
      'REMOVED_HELPER_ROLE',
      `${targetName} → Church Member`,
      church.id,
      church.church_name,
    );

    return {
      status: 200,
      message: 'Helper role removed successfully. User is now a Church Member.',
    };
  }
}
