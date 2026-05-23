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
import {
  UserStatus,
  ChurchMemberStatus,
  UserType,
} from 'prisma/generated/enums';

@Injectable()
export class ChurchMembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all members of the church where the admin belongs
   */
  async getChurchMembers(adminId: string, query: GetMembersDto) {
    // Get admin with their church membership and roles
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE, deleted_at: null },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    // Super admin can see all members across churches
    if (admin.type === UserType.SUPER_ADMIN) {
      return this.getAllMembersForSuperAdmin(query);
    }

    // Regular admin must belong to a church
    if (!adminChurchId) {
      throw new ForbiddenException('You are not associated with any church');
    }

    const { page, limit, search, status, role_id, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause for church members
    const churchMemberWhere: any = {
      church_id: adminChurchId,
      status: ChurchMemberStatus.ACTIVE,
      deleted_at: null,
    };

    // ✅ First, get TOTAL count of members (without pagination)
    const totalCount = await this.prisma.churchMember.count({
      where: churchMemberWhere,
    });

    // Get church members with their users (with pagination)
    const churchMembers = await this.prisma.churchMember.findMany({
      where: churchMemberWhere,
      include: {
        user: {
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
          },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy || 'joined_at']: sortOrder || 'desc' },
    });

    // ✅ Apply filters on the fetched members
    let filteredMembers = churchMembers;

    if (search) {
      filteredMembers = filteredMembers.filter((cm) =>
        `${cm.user.first_name} ${cm.user.last_name} ${cm.user.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    }

    if (status) {
      filteredMembers = filteredMembers.filter((cm) =>
        status === 'active'
          ? cm.user.status === UserStatus.ACTIVE
          : cm.user.status === UserStatus.SUSPENDED,
      );
    }

    if (role_id) {
      filteredMembers = filteredMembers.filter((cm) =>
        cm.user.roles_assigned_to_me.some((r) => r.role_id === role_id),
      );
    }

    // Format members data
    const formattedMembers = filteredMembers.map((cm) => {
      const roleAssignment = cm.user.roles_assigned_to_me[0];

      return {
        id: cm.user.id,
        name: `${cm.user.first_name} ${cm.user.last_name}`,
        first_name: cm.user.first_name,
        last_name: cm.user.last_name,
        email: cm.user.email,
        phone: cm.user.phone_number,
        status: cm.user.status,
        joined: cm.user.created_at,
        church_member_status: cm.status,
        church_role: cm.church_role,
        joined_at: cm.joined_at,
        role_id: roleAssignment?.role?.id || null,
        role_name: roleAssignment?.role?.name || null,
        role_title: roleAssignment?.role?.title || 'No Role',
        assigned_by: roleAssignment?.assigned_by || null,
        type: cm.user.type,
      };
    });

    // ✅ Use totalCount for pagination (not filteredMembers.length)
    const total = totalCount;

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
    const {
      page,
      limit,
      search,
      status,
      role_id,
      church_id,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause for church members
    const churchMemberWhere: any = {
      status: ChurchMemberStatus.ACTIVE,
      deleted_at: null,
    };

    if (church_id) {
      churchMemberWhere.church_id = church_id;
    }

    const churchMembers = await this.prisma.churchMember.findMany({
      where: churchMemberWhere,
      include: {
        user: {
          include: {
            roles_assigned_to_me: {
              where: church_id ? { churchId: church_id } : undefined,
              include: { role: true },
              take: 1,
            },
          },
        },
        church: {
          select: { church_name: true, id: true },
        },
      },
      skip,
      take: limit,
      orderBy: { [sortBy || 'joined_at']: sortOrder || 'desc' },
    });

    // Apply filters
    let filteredMembers = churchMembers;

    if (search) {
      filteredMembers = filteredMembers.filter((cm) =>
        `${cm.user.first_name} ${cm.user.last_name} ${cm.user.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    }

    if (status) {
      filteredMembers = filteredMembers.filter((cm) =>
        status === 'active'
          ? cm.user.status === UserStatus.ACTIVE
          : cm.user.status === UserStatus.SUSPENDED,
      );
    }

    if (role_id) {
      filteredMembers = filteredMembers.filter((cm) =>
        cm.user.roles_assigned_to_me.some((r) => r.role_id === role_id),
      );
    }

    const formattedMembers = filteredMembers.map((cm) => {
      const roleAssignment = cm.user.roles_assigned_to_me[0];

      return {
        id: cm.user.id,
        name: `${cm.user.first_name} ${cm.user.last_name}`,
        first_name: cm.user.first_name,
        last_name: cm.user.last_name,
        email: cm.user.email,
        phone: cm.user.phone_number,
        status: cm.user.status,
        joined: cm.user.created_at,
        church: cm.church?.church_name || 'No Church',
        church_id: cm.church_id,
        church_member_status: cm.status,
        church_role: cm.church_role,
        joined_at: cm.joined_at,
        role_id: roleAssignment?.role?.id || null,
        role_name: roleAssignment?.role?.name || null,
        role_title: roleAssignment?.role?.title || 'No Role',
        type: cm.user.type,
      };
    });

    const total = filteredMembers.length;

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
   * SIMPLIFIED: Uses role_id directly from Role model
   */
  async addMember(adminId: string, dto: CreateMemberDto) {
    // Get admin with their church membership
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        church_memberships: {
          where: { status: ChurchMemberStatus.ACTIVE, deleted_at: null },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;

    // Super admin check
    const isSuperAdmin = admin.type === UserType.SUPER_ADMIN;

    if (!isSuperAdmin && !adminChurchId) {
      throw new ForbiddenException('You are not associated with any church');
    }

    // Determine target church
    let targetChurchId: string;

    if (isSuperAdmin) {
      if (!dto.church_id) {
        throw new BadRequestException('Church ID is required for super admin');
      }
      targetChurchId = dto.church_id;
    } else {
      targetChurchId = adminChurchId!;
    }

    // Verify church exists
    const church = await this.prisma.church.findUnique({
      where: { id: targetChurchId, deleted_at: null },
    });

    if (!church) {
      throw new NotFoundException('Church not found');
    }

    // Get the role by ID
    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.role_id,
        deleted_at: null,
      },
    });

    if (!role) {
      throw new BadRequestException(`Role with ID "${dto.role_id}" not found`);
    }

    // Check if admin can assign this role
    if (!isSuperAdmin) {
      const canAssign = await this.canAssignRole(adminId, role.id);
      if (!canAssign) {
        throw new ForbiddenException(
          `You cannot assign the role "${role.name}"`,
        );
      }
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    let createdPassword: string | undefined;

    // Use transaction for all operations
    const result = await this.prisma.$transaction(async (tx) => {
      let user;

      if (existingUser) {
        // User exists, check if already a member of this church
        const existingMembership = await tx.churchMember.findFirst({
          where: {
            church_id: targetChurchId,
            user_id: existingUser.id,
            deleted_at: null,
          },
        });

        if (existingMembership?.status === ChurchMemberStatus.ACTIVE) {
          throw new BadRequestException(
            'User is already a member of this church',
          );
        }

        // Create or reactivate membership
        if (existingMembership) {
          await tx.churchMember.update({
            where: { id: existingMembership.id },
            data: {
              status: ChurchMemberStatus.ACTIVE,
              updated_at: new Date(),
              approved_by: adminId,
              approved_at: new Date(),
            },
          });
        } else {
          await tx.churchMember.create({
            data: {
              church_id: targetChurchId,
              user_id: existingUser.id,
              church_role: 'Member', // Default church role
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
            type: UserType.USER,
            status: UserStatus.ACTIVE,
            email_verified_at: new Date(),
          },
        });

        // Create church membership
        await tx.churchMember.create({
          data: {
            church_id: targetChurchId,
            user_id: user.id,
            church_role: 'Member', // Default church role
            status: ChurchMemberStatus.ACTIVE,
            joined_at: new Date(),
            approved_by: adminId,
            approved_at: new Date(),
          },
        });
      }

      // Check if role already assigned
      const existingRoleAssignment = await tx.roleUser.findFirst({
        where: {
          role_id: role.id,
          user_id: user.id,
          churchId: targetChurchId,
        },
      });

      if (!existingRoleAssignment) {
        // Assign role to user
        await tx.roleUser.create({
          data: {
            role_id: role.id,
            user_id: user.id,
            assigned_by_id: adminId,
            churchId: targetChurchId,
          },
        });
      }

      // Update church member count
      const memberCount = await tx.churchMember.count({
        where: {
          church_id: targetChurchId,
          status: ChurchMemberStatus.ACTIVE,
          deleted_at: null,
        },
      });

      await tx.church.update({
        where: { id: targetChurchId },
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
        church_id: targetChurchId,
        church_name: church.church_name,
        role_id: role.id,
        role_name: role.name,
        role_title: role.title,
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
          where: { status: ChurchMemberStatus.ACTIVE, deleted_at: null },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;
    const isSuperAdmin = admin.type === UserType.SUPER_ADMIN;

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

    // Check permission
    if (!isSuperAdmin) {
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
      isSuperAdmin && dto.church_id ? dto.church_id : adminChurchId;

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

    // Update role if role_id provided
    if (dto.role_id && churchId) {
      const newRole = await this.prisma.role.findFirst({
        where: { id: dto.role_id, deleted_at: null },
      });

      if (!newRole) {
        throw new BadRequestException(
          `Role with ID "${dto.role_id}" not found`,
        );
      }

      // Check if admin can assign this role
      if (!isSuperAdmin) {
        const canAssign = await this.canAssignRole(adminId, newRole.id);
        if (!canAssign) {
          throw new ForbiddenException(
            `You cannot assign the role "${newRole.name}"`,
          );
        }
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
          where: { status: ChurchMemberStatus.ACTIVE, deleted_at: null },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;
    const isSuperAdmin = admin.type === UserType.SUPER_ADMIN;

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

    // Permission check
    if (!isSuperAdmin && adminChurchId !== memberChurchId) {
      throw new ForbiddenException(
        'You cannot remove members from other churches',
      );
    }

    const churchId = isSuperAdmin ? memberChurchId : adminChurchId;

    if (!churchId) {
      throw new BadRequestException('Church ID not found');
    }

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
          where: { status: ChurchMemberStatus.ACTIVE, deleted_at: null },
          take: 1,
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const adminChurchId = admin.church_memberships[0]?.church_id;
    const isSuperAdmin = admin.type === UserType.SUPER_ADMIN;

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

    // Permission check
    if (!isSuperAdmin) {
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
        role_id: currentRole?.role?.id || null,
        role_name: currentRole?.role?.name || null,
        role_title: currentRole?.role?.title || 'No Role',
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
          member.type === UserType.PRO_USER
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
  async getAssignableRoles(adminId: string, churchId?: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        roles_assigned_to_me: {
          include: { role: true },
          where: churchId
            ? { churchId: churchId }
            : { churchId: { not: null } },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Super admin can assign all roles
    if (admin.type === UserType.SUPER_ADMIN) {
      const allRoles = await this.prisma.role.findMany({
        where: { deleted_at: null, status: 1 },
        select: {
          id: true,
          name: true,
          title: true,
          description: true,
        },
      });

      return {
        success: true,
        message: 'All roles fetched successfully (super admin)',
        data: allRoles,
      };
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
   * Get all available roles (for super admin dropdown)
   */
  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      where: { deleted_at: null, status: 1 },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      success: true,
      message: 'All roles fetched successfully',
      data: roles,
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

    if (user.type === UserType.SUPER_ADMIN) return true;

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
