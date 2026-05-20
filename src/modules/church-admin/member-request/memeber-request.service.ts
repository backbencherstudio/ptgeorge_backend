import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApprovalType,
  ApproveUserDto,
  GetProUsersDto,
  UserApprovalStatus,
  UserAccountType,
} from './dto/get-pro-users.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionAction, UserStatus, UserType } from 'prisma/generated/enums';
import { Role } from 'src/common/guard/role/role.enum';

@Injectable()
export class ProUserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllProUsers(query: GetProUsersDto) {
    const {
      page,
      limit,
      status,
      account_type,
      search,
      church_name,
      sort_by,
      sort_order,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {
      deleted_at: null,
    };

    // Filter by account type
    if (account_type && account_type !== UserAccountType.ALL) {
      whereClause.type = account_type;
    } else {
      whereClause.type = { in: [UserType.PRO_USER, UserType.USER] };
    }

    // Filter by status
    if (status === UserApprovalStatus.PENDING) {
      whereClause.status = UserStatus.PENDING;
      whereClause.roles_assigned_to_me = {
        none: {
          role: {
            name: {
              in: [Role.HELPER, Role.CHURCH_MEMBER],
            },
          },
        },
      };
    } else if (status === UserApprovalStatus.APPROVED) {
      whereClause.status = UserStatus.ACTIVE;
      whereClause.roles_assigned_to_me = {
        some: {
          role: {
            name: {
              in: [Role.HELPER, Role.CHURCH_MEMBER],
            },
          },
        },
      };
    } else if (status === UserApprovalStatus.REJECTED) {
      whereClause.status = UserStatus.REJECTED;
    }

    // Search by name or email
    if (search) {
      whereClause.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by church name
    if (church_name) {
      whereClause.church_name = { contains: church_name, mode: 'insensitive' };
    }

    // Get total count
    const total = await this.prisma.user.count({ where: whereClause });

    // Get users with limited fields
    const users = await this.prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sort_by || 'created_at']: sort_order || 'desc',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        church_name: true,
        language: true,
        type: true,
        status: true,
        created_at: true,
        company_name: true,
        business_email: true,
        service: true,
        category: true,
        profession: true,
        roles_assigned_to_me: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                title: true,
              },
            },
          },
          where: {
            role: {
              name: {
                in: [Role.HELPER, Role.CHURCH_MEMBER],
              },
            },
          },
        },
      },
    });

    // Transform data for response (limited fields)
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone_number: user.phone_number,
      church_name: user.church_name,
      account_type: user.type,
      status: user.status,
      created_at: user.created_at,
      is_looking_for_service: user.type === UserType.USER,
      is_offering_service: user.type === UserType.PRO_USER,
      service_info:
        user.type === UserType.PRO_USER
          ? {
              company_name: user.company_name,
              business_email: user.business_email,
              service: user.service,
              category: user.category,
              profession: user.profession,
            }
          : null,
      assigned_role: user.roles_assigned_to_me[0]?.role || null,
    }));

    return {
      data: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSingleMember(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      include: {
        roles_assigned_to_me: {
          include: {
            role: true,
          },
        },
        church: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has helper or member role
    const hasHelperOrMemberRole = user.roles_assigned_to_me.some(
      (ru) =>
        ru.role.name === Role.HELPER || ru.role.name === Role.CHURCH_MEMBER,
    );

    // Transform response with full details
    return {
      id: user.id,
      personal_info: {
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone_number: user.phone_number,
        church_name: user.church_name,
        language: user.language,
        status: user.status,
        created_at: user.created_at,
        email_verified_at: user.email_verified_at,
      },
      account_info: {
        type: user.type,
        is_looking_for_service: user.type === UserType.USER,
        is_offering_service: user.type === UserType.PRO_USER,
        approval_status:
          user.status === UserStatus.PENDING
            ? 'pending'
            : user.status === UserStatus.ACTIVE
              ? 'approved'
              : user.status === UserStatus.REJECTED
                ? 'rejected'
                : 'suspended',
        has_role_assigned: hasHelperOrMemberRole,
        assigned_roles: user.roles_assigned_to_me.map((ru) => ({
          id: ru.role.id,
          name: ru.role.name,
          title: ru.role.title,
          description: ru.role.description,
        })),
      },
      professional_info:
        user.type === UserType.PRO_USER
          ? {
              company_name: user.company_name,
              business_email: user.business_email,
              business_phone: user.business_phone,
              service: user.service,
              category: user.category,
              profession: user.profession,
              website: user.website,
              whatsapp_number: user.whatsapp_number,
              available_time: user.available_time,
              address: {
                line1: user.address_line1,
                line2: user.address_line2,
                state: user.state,
                country: user.country,
                zip_code: user.zip_code,
              },
              description: user.description,
              business_portfolio: user.business_portfolio,
            }
          : null,
      church_info: user.church
        ? {
            id: user.church.id,
            name: user.church.church_name,
            city: user.church.church_city,
            status: user.church.status,
          }
        : null,
    };
  }

  async approveUser(
    userId: string,
    approveUserDto: ApproveUserDto,
    adminId: string,
  ) {
    const { approvalType } = approveUserDto;

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      include: {
        roles_assigned_to_me: {
          include: {
            role: true,
          },
        },
        church_memberships: true, // Include existing memberships
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a church
    if (!user.church_id) {
      throw new BadRequestException('User is not associated with any church');
    }

    // Check if user already has helper or member role
    const existingRole = user.roles_assigned_to_me.find(
      (ru) =>
        ru.role.name === Role.HELPER || ru.role.name === Role.CHURCH_MEMBER,
    );

    if (existingRole) {
      throw new BadRequestException(
        `User already has ${existingRole.role.name} role`,
      );
    }

    // Check if user is already a church member
    const existingMembership = user.church_memberships.find(
      (cm) => cm.church_id === user.church_id && cm.status === 'ACTIVE',
    );

    if (existingMembership) {
      throw new BadRequestException(
        'User is already an active member of this church',
      );
    }

    // Get or create the role
    const roleName =
      approvalType === ApprovalType.HELPER ? Role.HELPER : Role.CHURCH_MEMBER;
    let role = await this.prisma.role.findFirst({
      where: {
        name: roleName,
        deleted_at: null,
      },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: {
          name: roleName,
          title: roleName === Role.HELPER ? 'Helper' : 'Church Member',
          description:
            roleName === Role.HELPER
              ? 'Can help with church services and activities'
              : 'Regular church member with access to member features',
          status: 1,
        },
      });

      const permissions = await this.getPermissionsForRole(roleName);
      for (const permission of permissions) {
        await this.prisma.permissionRole.create({
          data: {
            role_id: role.id,
            permission_id: permission.id,
          },
        });
      }
    }

    // Use transaction for all operations
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Assign role to user
      await tx.roleUser.create({
        data: {
          role_id: role.id,
          user_id: user.id,
          assigned_by_id: adminId,
          churchId: user.church_id,
        },
      });

      // 2. Create or update church membership
      const existingMembershipRecord = await tx.churchMember.findFirst({
        where: {
          church_id: user.church_id,
          user_id: user.id,
        },
      });

      let churchMember;
      if (existingMembershipRecord) {
        // Update existing membership
        churchMember = await tx.churchMember.update({
          where: { id: existingMembershipRecord.id },
          data: {
            status: 'ACTIVE',
            church_role: roleName === Role.HELPER ? 'Helper' : 'Member',
            approved_by: adminId,
            approved_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else {
        // Create new membership
        churchMember = await tx.churchMember.create({
          data: {
            church_id: user.church_id,
            user_id: user.id,
            church_role: roleName === Role.HELPER ? 'Helper' : 'Member',
            status: 'ACTIVE',
            joined_at: new Date(),
            approved_by: adminId,
            approved_at: new Date(),
          },
        });
      }

      // 3. Update user status from PENDING to ACTIVE
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });

      // 4. Update church member count
      const memberCount = await tx.churchMember.count({
        where: {
          church_id: user.church_id,
          status: 'ACTIVE',
          deleted_at: null,
        },
      });

      await tx.church.update({
        where: { id: user.church_id },
        data: { church_members: memberCount },
      });

      return { churchMember };
    });

    // Create notification for the user
    await this.createApprovalNotification(user.id, approvalType);

    // Get updated user with role
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        type: true,
        status: true,
        church_id: true,
      },
    });

    return {
      success: true,
      message: `User approved as ${roleName.toLowerCase()} successfully and added to church members`,
      data: {
        user: updatedUser,
        role: {
          id: role.id,
          name: role.name,
          title: role.title,
        },
        church_membership: {
          id: result.churchMember.id,
          status: result.churchMember.status,
          role: result.churchMember.church_role,
          joined_at: result.churchMember.joined_at,
        },
      },
    };
  }

  private async getPermissionsForRole(roleName: string) {
    const permissionNames =
      roleName === Role.HELPER
        ? [
            { name: 'view_members', action: PermissionAction.read },
            { name: 'view_services', action: PermissionAction.read },
            { name: 'offer_help', action: PermissionAction.create },
            { name: 'respond_requests', action: PermissionAction.update },
          ]
        : [
            { name: 'view_members', action: PermissionAction.read },
            { name: 'view_services', action: PermissionAction.read },
            { name: 'request_services', action: PermissionAction.create },
            { name: 'participate_activities', action: PermissionAction.update },
          ];

    const permissions = [];

    for (const perm of permissionNames) {
      let permission = await this.prisma.permission.findFirst({
        where: {
          name: perm.name,
          deleted_at: null,
        },
      });

      if (!permission) {
        permission = await this.prisma.permission.create({
          data: {
            name: perm.name,
            title: perm.name.replace('_', ' ').toUpperCase(),
            action: perm.action,
            status: 'ACTIVE',
            description: `Permission to ${perm.action} ${perm.name}`,
          },
        });
      }

      permissions.push(permission);
    }

    return permissions;
  }

  private async createApprovalNotification(
    userId: string,
    approvalType: ApprovalType,
  ) {
    const roleName = approvalType === ApprovalType.HELPER ? 'Helper' : 'Member';

    let notificationEvent = await this.prisma.notificationEvent.findFirst({
      where: {
        type: 'APPROVAL_CONFIRMATION',
      },
    });

    if (!notificationEvent) {
      notificationEvent = await this.prisma.notificationEvent.create({
        data: {
          type: 'APPROVAL_CONFIRMATION',
          text: `Your account has been approved as a ${roleName}`,
          status: 1,
        },
      });
    }

    await this.prisma.notification.create({
      data: {
        receiver_id: userId,
        notification_event_id: notificationEvent.id,
        status: 1,
      },
    });
  }
}
