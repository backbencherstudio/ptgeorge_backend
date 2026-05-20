import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApprovalType,
  ApproveUserDto,
  GetProUsersDto,
} from './dto/get-pro-users.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionAction, UserType } from 'prisma/generated/enums';

@Injectable()
export class ProUserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllProUsers(query: GetProUsersDto) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    // Build where clause based on status
    let whereClause: any = {
      type: UserType.PRO_USER,
      deleted_at: null,
    };

    if (status === 'pending') {
      // Users with no helper or member role assigned
      whereClause = {
        ...whereClause,
        roles_assigned_to_me: {
          none: {
            role: {
              name: {
                in: ['HELPER', 'CHURCH_MEMBER'],
              },
            },
          },
        },
      };
    } else if (status === 'approved') {
      whereClause = {
        ...whereClause,
        roles_assigned_to_me: {
          some: {
            role: {
              name: {
                in: ['HELPER', 'CHURCH_MEMBER'],
              },
            },
          },
        },
      };
    }

    // Get total count
    const total = await this.prisma.user.count({ where: whereClause });

    // Get users with their roles
    const users = await this.prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
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

    // Transform data for response
    const transformedUsers = users.map((user) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      church_name: user.church_name,
      language: user.language,
      type: user.type,
      company_name: user.company_name,
      business_email: user.business_email,
      business_phone: user.business_phone,
      service: user.service,
      category: user.category,
      profession: user.profession,
      website: user.website,
      whatsapp_number: user.whatsapp_number,
      available_time: user.available_time,
      address_line1: user.address_line1,
      address_line2: user.address_line2,
      state: user.state,
      country: user.country,
      zip_code: user.zip_code,
      description: user.description,
      business_portfolio: user.business_portfolio,
      status: user.status,
      created_at: user.created_at,
      roles: user.roles_assigned_to_me.map((ru) => ({
        id: ru.role.id,
        name: ru.role.name,
        title: ru.role.title,
        description: ru.role.description,
      })),
      church: user.church
        ? {
            id: user.church.id,
            name: user.church.church_name,
            city: user.church.church_city,
          }
        : null,
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

  async approveUser(userId: string, approveUserDto: ApproveUserDto) {
    const { approvalType } = approveUserDto;

    // Check if user exists and is a PRO_USER
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        type: UserType.PRO_USER,
        deleted_at: null,
      },
      include: {
        roles_assigned_to_me: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found or is not a PRO_USER');
    }

    // Check if user already has helper or member role
    const existingRole = user.roles_assigned_to_me.find(
      (ru) => ru.role.name === 'HELPER' || ru.role.name === 'CHURCH_MEMBER',
    );

    if (existingRole) {
      throw new BadRequestException(
        `User already has ${existingRole.role.name} role`,
      );
    }

    // Get or create the role
    const roleName =
      approvalType === ApprovalType.HELPER ? 'HELPER' : 'CHURCH_MEMBER';
    let role = await this.prisma.role.findFirst({
      where: {
        name: roleName,
        deleted_at: null,
      },
    });

    if (!role) {
      // Create the role if it doesn't exist
      role = await this.prisma.role.create({
        data: {
          name: roleName,
          title: roleName === 'HELPER' ? 'Helper' : 'Church Member',
          description:
            roleName === 'HELPER'
              ? 'Can help with church services and activities'
              : 'Regular church member with access to member features',
          status: 1,
        },
      });

      // Create basic permissions for the role
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

    // Assign role to user
    await this.prisma.roleUser.create({
      data: {
        role_id: role.id,
        user_id: user.id,
        assigned_by_id: userId, // TODO: Get from current admin user
        churchId: user.church_id,
      },
      include: {
        role: true,
      },
    });

    // Update user status if it was pending
    if (user.status === 0 || user.status === 2) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 1 },
      });
    }

    // Create notification for the user
    await this.createApprovalNotification(user.id, approvalType);

    return {
      message: `User approved as ${roleName.toLowerCase()} successfully`,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        type: user.type,
        status: user.status,
      },
      role: {
        id: role.id,
        name: role.name,
        title: role.title,
      },
    };
  }

  private async getPermissionsForRole(roleName: string) {
    // Define permissions based on role
    const permissionNames =
      roleName === 'HELPER'
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

    // Get or create notification event
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

    // Create notification
    await this.prisma.notification.create({
      data: {
        receiver_id: userId,
        notification_event_id: notificationEvent.id,
        status: 1,
      },
    });

    // // Update user notification settings if needed
    // const settings = await this.prisma.userNotificationSetting.findFirst({
    //   where: {
    //     user_id: userId,
    //     type: 'APPROVAL_CONFIRMATION',
    //   },
    // });

    // if (!settings) {
    //   await this.prisma.userNotificationSetting.create({
    //     data: {
    //       user_id: userId,
    //       type: 'APPROVAL_CONFIRMATION',
    //       is_enabled: true,
    //     },
    //   });
    // }
  }
}
