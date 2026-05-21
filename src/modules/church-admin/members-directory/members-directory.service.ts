import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { GetMembersDto } from './dto/get-members.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UserStatus, ChurchMemberStatus } from 'prisma/generated/enums';
import { Role } from 'src/common/guard/role/role.enum';

@Injectable()
export class ChurchMembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all members of the church where the admin belongs
   */
  async getChurchMembers(adminId: string, query: GetMembersDto) {
    // Get admin with their church membership
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    // Super admin can see all members across churches
    if (admin.type === 'SUPER_ADMIN') {
      return this.getAllMembersForSuperAdmin(query);
    }

    // Regular admin must belong to a church
    if (!adminChurchId) {
      throw new ForbiddenException('You are not associated with any church');
    }

    const { page, limit, search, status, role, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Get user IDs that are members of this church
    const churchMembers = await this.prisma.churchMember.findMany({
      where: {
        church_id: adminChurchId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
      select: { user_id: true },
    });

    const userIds = churchMembers.map((cm) => cm.user_id);

    // Build where clause for users
    const where: any = {
      id: { in: userIds },
      deleted_at: null,
    };

    // Filter by status
    if (status) {
      where.status =
        status === 'active' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    }

    // Search by name or email
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by role
    if (role) {
      where.roles_assigned_to_me = {
        some: {
          role: { name: role },
          churchId: adminChurchId,
        },
      };
    }

    // Get members with their roles and church membership
    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy || 'created_at']: sortOrder || 'desc' },
        include: {
          roles_assigned_to_me: {
            where: { churchId: adminChurchId },
            include: {
              role: true,
              assigned_by: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
          church_memberships: {
            where: { church_id: adminChurchId },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Format members data
    const formattedMembers = members.map((member) => {
      const membership = member.church_memberships[0];
      const roleAssignment = member.roles_assigned_to_me[0];

      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone_number,
        status: member.status,
        joined: member.created_at,
        church_member_status: membership?.status || 'PENDING',
        church_role: membership?.church_role || null,
        joined_at: membership?.joined_at || member.created_at,
        role: roleAssignment?.role?.title || 'No Role',
        role_name: roleAssignment?.role?.name || null,
        assigned_by: roleAssignment?.assigned_by || null,
        type: member.type,
      };
    });

    return {
      success: true,
      message: 'Church members fetched successfully',
      data: formattedMembers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all members across churches (for super admin)
   */
  private async getAllMembersForSuperAdmin(query: GetMembersDto) {
    const { page, limit, search, status, role, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (status) {
      where.status =
        status === 'active' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.roles_assigned_to_me = {
        some: {
          role: { name: role },
        },
      };
    }

    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy || 'created_at']: sortOrder || 'desc' },
        include: {
          church_memberships: {
            include: {
              church: {
                select: { church_name: true, id: true },
              },
            },
            take: 1,
          },
          roles_assigned_to_me: {
            include: { role: true },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedMembers = members.map((member) => {
      const membership = member.church_memberships[0];
      const roleAssignment = member.roles_assigned_to_me[0];

      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone_number,
        status: member.status,
        joined: member.created_at,
        church: membership?.church?.church_name || 'No Church',
        church_id: membership?.church_id || null,
        church_member_status: membership?.status || 'NOT_A_MEMBER',
        church_role: membership?.church_role || null,
        joined_at: membership?.joined_at || null,
        role: roleAssignment?.role?.title || 'No Role',
        role_name: roleAssignment?.role?.name || null,
        type: member.type,
      };
    });

    return {
      success: true,
      message: 'All members fetched successfully',
      data: formattedMembers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add a new member to the church (with church membership)
   */
  async addMember(adminId: string, dto: CreateMemberDto) {
    // Get admin with their church membership
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    if (!adminChurchId && admin.type !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You are not associated with any church');
    }

    const churchId =
      admin.type === 'SUPER_ADMIN' ? dto.church_id : adminChurchId;

    if (!churchId) {
      throw new BadRequestException('Church ID is required');
    }

    // Verify church exists
    const church = await this.prisma.church.findUnique({
      where: { id: churchId, deleted_at: null },
    });

    if (!church) {
      throw new NotFoundException('Church not found');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    let userId: string;
    let createdPassword: string | undefined;

    // Use transaction for all operations
    const result = await this.prisma.$transaction(async (tx) => {
      let user;

      if (existingUser) {
        // User exists, check if already a member of this church
        const existingMembership = await tx.churchMember.findFirst({
          where: {
            church_id: churchId,
            user_id: existingUser.id,
            deleted_at: null,
          },
        });

        if (
          existingMembership &&
          existingMembership.status === ChurchMemberStatus.ACTIVE
        ) {
          throw new BadRequestException(
            'User is already a member of this church',
          );
        }

        userId = existingUser.id;

        // Update existing membership or create new one
        if (existingMembership) {
          await tx.churchMember.update({
            where: { id: existingMembership.id },
            data: {
              status: ChurchMemberStatus.ACTIVE,
              church_role: dto.church_role || 'Member',
              updated_at: new Date(),
              approved_by: adminId,
              approved_at: new Date(),
            },
          });
        } else {
          await tx.churchMember.create({
            data: {
              church_id: churchId,
              user_id: existingUser.id,
              church_role: dto.church_role || 'Member',
              status: ChurchMemberStatus.ACTIVE,
              joined_at: new Date(),
              approved_by: adminId,
              approved_at: new Date(),
            },
          });
        }

        user = existingUser;
      } else {
        // Create new user
        const password = dto.password || this.generateRandomPassword();
        createdPassword = password;
        const hashedPassword = await bcrypt.hash(password, 10);

        user = await tx.user.create({
          data: {
            first_name: dto.first_name,
            last_name: dto.last_name,
            email: dto.email,
            phone_number: dto.phone_number,
            church_name: church.church_name,
            language: dto.language || 'en',
            password: hashedPassword,
            type: 'USER',
            status: UserStatus.ACTIVE,
            email_verified_at: new Date(),
          },
        });

        // Create church membership
        await tx.churchMember.create({
          data: {
            church_id: churchId,
            user_id: user.id,
            church_role: dto.church_role || 'Member',
            status: ChurchMemberStatus.ACTIVE,
            joined_at: new Date(),
            approved_by: adminId,
            approved_at: new Date(),
          },
        });
      }

      // Get or create the role
      const roleName =
        dto.role_name === 'helper'
          ? Role.HELPER
          : dto.role_name === 'member'
            ? Role.CHURCH_MEMBER
            : dto.role_name;

      let role = await tx.role.findFirst({
        where: { name: roleName, deleted_at: null },
      });

      if (!role) {
        throw new BadRequestException(`Role "${dto.role_name}" not found`);
      }

      // Check if admin can assign this role
      const canAssign = await this.canAssignRole(adminId, role.id);
      if (!canAssign && admin.type !== 'SUPER_ADMIN') {
        throw new ForbiddenException(
          `You cannot assign the role "${dto.role_name}"`,
        );
      }

      // Assign role to user
      await tx.roleUser.create({
        data: {
          role_id: role.id,
          user_id: user.id,
          assigned_by_id: adminId,
          churchId: churchId,
        },
      });

      // Update church member count
      const memberCount = await tx.churchMember.count({
        where: {
          church_id: churchId,
          status: ChurchMemberStatus.ACTIVE,
          deleted_at: null,
        },
      });

      await tx.church.update({
        where: { id: churchId },
        data: { church_members: memberCount },
      });

      return { user, password: createdPassword };
    });

    return {
      success: true,
      message: existingUser
        ? 'Member added to church successfully'
        : 'Member created and added to church successfully',
      data: {
        id: result.user.id,
        first_name: result.user.first_name,
        last_name: result.user.last_name,
        email: result.user.email,
        phone: result.user.phone_number,
        church_id: churchId,
        church_name: church.church_name,
        role: dto.role_name,
        church_role: dto.church_role || 'Member',
        temporary_password: result.password,
      },
    };
  }

  /**
   * Update a member
   */
  async updateMember(adminId: string, memberId: string, dto: UpdateMemberDto) {
    // Get admin with their church membership
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    // Get the member with their church memberships
    const member = await this.prisma.user.findUnique({
      where: { id: memberId, deleted_at: null },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Super admin can edit anyone
    if (admin.type !== 'SUPER_ADMIN') {
      // Check if member belongs to admin's church
      const membership = member.church_memberships.find(
        (cm) => cm.church_id === adminChurchId,
      );

      if (!membership) {
        throw new ForbiddenException(
          'You cannot edit members from other churches',
        );
      }
    }

    const churchId =
      admin.type === 'SUPER_ADMIN' && dto.church_id
        ? dto.church_id
        : adminChurchId;

    // Update member data
    const updateData: any = {};
    if (dto.first_name) updateData.first_name = dto.first_name;
    if (dto.last_name) updateData.last_name = dto.last_name;
    if (dto.email) updateData.email = dto.email;
    if (dto.phone_number) updateData.phone_number = dto.phone_number;
    if (dto.status) {
      updateData.status =
        dto.status === 'active' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    }

    const updatedMember = await this.prisma.user.update({
      where: { id: memberId },
      data: updateData,
    });

    // Update church membership if church_role provided
    if (dto.church_role && churchId) {
      await this.prisma.churchMember.updateMany({
        where: {
          user_id: memberId,
          church_id: churchId,
        },
        data: {
          church_role: dto.church_role,
          updated_at: new Date(),
        },
      });
    }

    // Update role if provided
    if (dto.role_name && churchId) {
      const newRole = await this.prisma.role.findFirst({
        where: { name: dto.role_name, deleted_at: null },
      });

      if (!newRole) {
        throw new BadRequestException(`Role "${dto.role_name}" not found`);
      }

      // Check if admin can assign this role
      const canAssign = await this.canAssignRole(adminId, newRole.id);
      if (!canAssign && admin.type !== 'SUPER_ADMIN') {
        throw new ForbiddenException(
          `You cannot assign the role "${dto.role_name}"`,
        );
      }

      // Remove existing role assignment for this church
      await this.prisma.roleUser.deleteMany({
        where: {
          user_id: memberId,
          churchId: churchId,
        },
      });

      // Assign new role
      await this.prisma.roleUser.create({
        data: {
          role_id: newRole.id,
          user_id: memberId,
          assigned_by_id: adminId,
          churchId: churchId,
        },
      });
    }

    return {
      success: true,
      message: 'Member updated successfully',
      data: updatedMember,
    };
  }

  /**
   * Remove a member from church (soft delete membership)
   */
  async removeMember(adminId: string, memberId: string) {
    // Get admin with their church membership
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    // Get the member
    const member = await this.prisma.user.findUnique({
      where: { id: memberId, deleted_at: null },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const memberChurchId = member.church_memberships[0]?.church_id;

    // Super admin can remove anyone
    if (admin.type !== 'SUPER_ADMIN') {
      // Check if member belongs to admin's church
      if (adminChurchId !== memberChurchId) {
        throw new ForbiddenException(
          'You cannot remove members from other churches',
        );
      }
    }

    const churchId =
      admin.type === 'SUPER_ADMIN' ? memberChurchId : adminChurchId;

    // Soft delete membership
    await this.prisma.churchMember.updateMany({
      where: {
        user_id: memberId,
        church_id: churchId,
      },
      data: {
        status: ChurchMemberStatus.REMOVED,
        deleted_at: new Date(),
      },
    });

    // Remove role assignment for this church
    await this.prisma.roleUser.deleteMany({
      where: {
        user_id: memberId,
        churchId: churchId,
      },
    });

    // Update church member count
    if (churchId) {
      const memberCount = await this.prisma.churchMember.count({
        where: {
          church_id: churchId,
          status: ChurchMemberStatus.ACTIVE,
          deleted_at: null,
        },
      });
      await this.prisma.church.update({
        where: { id: churchId },
        data: { church_members: memberCount },
      });
    }

    return {
      success: true,
      message: 'Member removed from church successfully',
    };
  }

  /**
   * Get member by ID with church membership details
   */
  async getMemberById(adminId: string, memberId: string) {
    // Get admin with their church membership
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    // Get the member with church memberships
    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        deleted_at: null,
      },
      include: {
        roles_assigned_to_me: {
          include: {
            role: true,
            assigned_by: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        church_memberships: {
          include: {
            church: {
              select: { church_name: true, id: true },
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Super admin can view anyone
    if (admin.type !== 'SUPER_ADMIN') {
      // Check if member belongs to admin's church
      const belongsToChurch = member.church_memberships.some(
        (cm) =>
          cm.church_id === adminChurchId &&
          cm.status === ChurchMemberStatus.ACTIVE,
      );

      if (!belongsToChurch) {
        throw new ForbiddenException(
          'You cannot view members from other churches',
        );
      }
    }

    const currentRole = member.roles_assigned_to_me[0];
    const activeMembership = member.church_memberships.find(
      (cm) => cm.status === ChurchMemberStatus.ACTIVE,
    );

    return {
      success: true,
      message: 'Member fetched successfully',
      data: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        full_name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        phone: member.phone_number,
        status: member.status,
        joined: member.created_at,
        church: activeMembership?.church?.church_name,
        church_id: activeMembership?.church_id,
        role: currentRole?.role?.title || 'No Role',
        role_name: currentRole?.role?.name || null,
        assigned_by: currentRole?.assigned_by || null,
        type: member.type,
        church_membership: activeMembership
          ? {
              id: activeMembership.id,
              status: activeMembership.status,
              church_role: activeMembership.church_role,
              joined_at: activeMembership.joined_at,
              approved_by: activeMembership.approved_by,
              approved_at: activeMembership.approved_at,
            }
          : null,
        professional_info:
          member.type === 'PRO_USER'
            ? {
                company_name: member.company_name,
                business_email: member.business_email,
                business_phone: member.business_phone,
                service: member.service,
                category: member.category,
                profession: member.profession,
              }
            : null,
      },
    };
  }

  /**
   * Get available roles that admin can assign
   */
  async getAssignableRoles(adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        roles_assigned_to_me: {
          include: { role: true },
          where: { churchId: { not: null } },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const userRoleIds = admin.roles_assigned_to_me.map((ru) => ru.role_id);

    const rules = await this.prisma.roleAssignmentRule.findMany({
      where: { from_role_id: { in: userRoleIds } },
      include: { to_role: true },
    });

    const assignableRoles = rules.map((r) => r.to_role);
    const uniqueRoles = [
      ...new Map(assignableRoles.map((r) => [r.id, r])).values(),
    ];

    return {
      success: true,
      message: 'Assignable roles fetched successfully',
      data: uniqueRoles.map((role) => ({
        id: role.id,
        name: role.name,
        title: role.title,
        description: role.description,
      })),
    };
  }

  /**
   * Check if user can assign a role
   */
  private async canAssignRole(
    userId: string,
    targetRoleId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles_assigned_to_me: { include: { role: true } } },
    });

    if (!user) return false;

    if (user.type === 'SUPER_ADMIN') return true;

    const userRoleIds = user.roles_assigned_to_me.map((ru) => ru.role_id);
    const rule = await this.prisma.roleAssignmentRule.findFirst({
      where: {
        from_role_id: { in: userRoleIds },
        to_role_id: targetRoleId,
      },
    });

    return !!rule;
  }

  /**
   * Generate random password
   */
  private generateRandomPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
