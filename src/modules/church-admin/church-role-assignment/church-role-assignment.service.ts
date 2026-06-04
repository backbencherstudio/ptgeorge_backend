import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ChurchMemberStatus, UserStatus } from 'prisma/generated/enums';
import { AuditLogService } from 'src/modules/application/audit-log/audit-log.service';

@Injectable()
export class ChurchRoleAssignmentService {
  private readonly logger = new Logger(ChurchRoleAssignmentService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  // ─── Helper: Create audit log ─────────────────────────────────────────────────
  private async createAuditLog(
    userId: string | undefined,
    action: string,
    target: string,
    churchId?: string | null,
    churchName?: string | null,
  ) {
    try {
      if (!userId) {
        this.logger.log('No userId provided for audit log, skipping...');
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { churchUser: true },
      });

      if (!user) {
        this.logger.log(`User with id ${userId} not found for audit log`);
        return;
      }

      let actorName: string = user.type;
      if (user.first_name && user.last_name) {
        actorName = `${user.first_name} ${user.last_name}`;
      } else if (user.first_name) {
        actorName = user.first_name;
      }

      let finalChurchName = churchName;
      let finalChurchId = churchId;

      if (churchId && !finalChurchName) {
        const church = await this.prisma.church.findUnique({
          where: { id: churchId },
        });
        if (church) {
          finalChurchName = church.church_name;
        }
      }

      if (
        user.type === 'CHURCH_ADMIN' &&
        !finalChurchId &&
        user.churchUser &&
        user.churchUser.length > 0
      ) {
        finalChurchId = user.churchUser[0].id;
        finalChurchName = user.churchUser[0].church_name;
      }

      await this.auditLogService.createLog({
        actor: actorName,
        action: action,
        target: target,
        church: finalChurchName || '--',
        actor_id: userId,
        actor_type: user.type,
        church_id: finalChurchId || null,
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  // Get all roles that the current user is allowed to assign
  async getAssignableRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles_assigned_to_me: {
          include: { role: true },
          where: { churchId: { not: null } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const userRoleIds = user.roles_assigned_to_me.map((ru) => ru.role_id);

    // Find rules where from_role_id is one of user's roles
    const rules = await this.prisma.roleAssignmentRule.findMany({
      where: { from_role_id: { in: userRoleIds } },
      include: { to_role: true },
    });

    const assignableRoles = rules.map((r) => r.to_role);
    // Remove duplicates
    return [...new Map(assignableRoles.map((r) => [r.id, r])).values()];
  }

  // Get the user's church ID from their church memberships
  private async getUserChurchId(userId: string): Promise<string | null> {
    const membership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
      select: { church_id: true },
    });
    return membership?.church_id || null;
  }

  // List all users of the same church with their current role
  async getChurchUsers(currentUserId: string) {
    // Get current user's church from their active membership
    const currentUserChurchId = await this.getUserChurchId(currentUserId);

    if (!currentUserChurchId) {
      throw new ForbiddenException('User has no church membership');
    }

    // Get all church members with their roles
    const members = await this.prisma.churchMember.findMany({
      where: {
        church_id: currentUserChurchId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
      include: {
        user: {
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
                    phone_number: true,
                  },
                },
              },
              where: { churchId: currentUserChurchId },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return members.map((member) => {
      const user = member.user;
      const roleAssignment = user.roles_assigned_to_me[0];

      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone_number,
        joinedAt: member.joined_at,
        churchRole: member.church_role,
        currentRole: roleAssignment?.role || null,
        assignedBy: roleAssignment?.assigned_by || null,
        assignedAt: roleAssignment?.created_at || null,
      };
    });
  }

  async getAllChurchUsers(
    adminUserId: string,
    filters: {
      status?: UserStatus;
      memberStatus?: ChurchMemberStatus;
      role?: string;
      search?: string;
      fields?: string[];
      page?: number;
      limit?: number;
    },
  ): Promise<{
    churchId: string;
    churchName: string;
    users: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      status,
      memberStatus,
      role,
      search,
      fields,
      page = 1,
      limit = 10,
    } = filters;
    const skip = (page - 1) * limit;

    // 1. Get admin's church from active membership
    const adminMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: adminUserId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
      include: {
        church: {
          select: {
            id: true,
            church_name: true,
          },
        },
      },
    });

    if (!adminMembership) {
      throw new ForbiddenException('You are not associated with any church');
    }

    const churchId = adminMembership.church_id;
    const churchName = adminMembership.church.church_name;

    // 2. Build the where clause for church members
    const memberWhere: any = {
      church_id: churchId,
      deleted_at: null,
    };

    // Filter by church member status
    if (memberStatus) {
      memberWhere.status = memberStatus;
    }

    // Filter by user status (through user relation)
    if (status) {
      memberWhere.user = {
        status: status,
      };
    }

    // Filter by user search
    if (search) {
      memberWhere.user = {
        ...memberWhere.user,
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone_number: { contains: search } },
        ],
      };
    }

    // Filter by role
    if (role) {
      memberWhere.user = {
        ...memberWhere.user,
        roles_assigned_to_me: {
          some: {
            churchId: churchId,
            role: {
              name: role,
            },
          },
        },
      };
    }

    // 3. Get all church members with pagination
    const [members, total] = await Promise.all([
      this.prisma.churchMember.findMany({
        where: memberWhere,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { joined_at: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone_number: true,
              status: true,
              type: true,
              email_verified_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              church_name: true,
              language: true,
              company_name: true,
              business_email: true,
              service: true,
              category: true,
              profession: true,
              website: true,
              whatsapp_number: true,
              available_time: true,
              address_line1: true,
              address_line2: true,
              state: true,
              country: true,
              zip_code: true,
              business_portfolio: true,
              description: true,
              avatar: true,
              about_me: true,
              bio: true,
              roles_assigned_to_me: {
                where: { churchId: churchId },
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      title: true,
                      color: true,
                    },
                  },
                  assigned_by: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.churchMember.count({ where: memberWhere }),
    ]);

    // 4. Format the response with field selection
    const users = members.map((member) => {
      const user = member.user;
      const roleAssignment = user.roles_assigned_to_me[0];

      // Build the full user object
      const fullUserData = {
        // Basic info
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone_number: user.phone_number,
        church_name: user.church_name,
        language: user.language,

        // Status info
        status: user.status,
        userType: user.type,
        churchMemberStatus: member.status,
        isEmailVerified: !!user.email_verified_at,
        email_verified_at: user.email_verified_at,

        // Dates
        joinedAt: member.joined_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        deleted_at: user.deleted_at,

        // Church role
        churchRole: member.church_role,

        // Role assignment
        currentRole: roleAssignment?.role || null,
        assignedBy: roleAssignment?.assigned_by || null,
        assignedAt: roleAssignment?.created_at || null,

        // PRO User fields
        company_name: user.company_name,
        business_email: user.business_email,
        service: user.service,
        category: user.category,
        profession: user.profession,
        website: user.website,
        whatsapp_number: user.whatsapp_number,
        available_time: user.available_time,

        // Address fields
        address_line1: user.address_line1,
        address_line2: user.address_line2,
        state: user.state,
        country: user.country,
        zip_code: user.zip_code,

        // Portfolio & Bio
        business_portfolio: user.business_portfolio,
        description: user.description,
        avatar: user.avatar,
        about_me: user.about_me,
        bio: user.bio,
      };

      // If fields are specified, only return requested fields
      if (fields && fields.length > 0) {
        const filteredData: any = {};
        fields.forEach((field) => {
          if (field in fullUserData) {
            filteredData[field] = fullUserData[field];
          }
        });
        return filteredData;
      }

      return fullUserData;
    });

    return {
      churchId,
      churchName,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Assign a role to a user (replaces any existing role)
  async assignRole(assignerId: string, dto: AssignRoleDto) {
    const { userId, roleId, sendEmail } = dto;

    // 1. Check assigner permissions
    const canAssign = await this.canAssignRole(assignerId, roleId);
    if (!canAssign) {
      throw new ForbiddenException('You are not allowed to assign this role');
    }

    // 2. Get assigner's church from active membership
    const assignerChurchId = await this.getUserChurchId(assignerId);
    if (!assignerChurchId) {
      throw new ForbiddenException('You are not associated with any church');
    }

    // 3. Check that target user belongs to same church
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if target user is a member of the same church
    const targetMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        church_id: assignerChurchId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!targetMembership) {
      throw new ForbiddenException('User does not belong to your church');
    }

    // Get the role
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, title: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Get previous role for audit log
    const previousAssignment = await this.prisma.roleUser.findFirst({
      where: {
        user_id: userId,
        churchId: assignerChurchId,
      },
      include: {
        role: {
          select: { id: true, name: true, title: true },
        },
      },
    });

    // 4. Remove any existing role assignment for this user in this church
    await this.prisma.roleUser.deleteMany({
      where: {
        user_id: userId,
        churchId: assignerChurchId,
      },
    });

    // 5. Create new assignment
    const assignment = await this.prisma.roleUser.create({
      data: {
        user_id: userId,
        role_id: roleId,
        assigned_by_id: assignerId,
        churchId: assignerChurchId,
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    // 6. Update church_member's church_role if needed
    if (role.name === 'HELPER') {
      await this.prisma.churchMember.update({
        where: { id: targetMembership.id },
        data: { church_role: 'Helper' },
      });
    } else if (role.name === 'CHURCH_MEMBER') {
      await this.prisma.churchMember.update({
        where: { id: targetMembership.id },
        data: { church_role: 'Member' },
      });
    }

    // 7. Send email notification if requested (implement if needed)
    if (sendEmail) {
      console.log(
        `Email would be sent to ${targetUser.email} about role assignment`,
      );
    }

    // Create audit log
    const targetName =
      `${targetUser.first_name} ${targetUser.last_name}`.trim();
    const roleTitle = role.title || role.name;
    const previousRoleTitle =
      previousAssignment?.role?.title ||
      previousAssignment?.role?.name ||
      'none';

    await this.createAuditLog(
      assignerId,
      'ASSIGNED_ROLE',
      `${targetName} → ${roleTitle} (previous: ${previousRoleTitle})`,
      assignerChurchId,
      null,
    );

    return {
      status: 200,
      message: 'Role assigned successfully',
      data: {
        role_id: assignment.role_id,
        user_id: assignment.user_id,
        user: assignment.user,
        role: assignment.role,
        churchId: assignerChurchId,
        assigned_by_id: assignment.assigned_by_id,
        created_at: assignment.created_at,
      },
    };
  }

  // Update a user's role (replace current role with a new one)
  async updateUserRole(assignerId: string, userId: string, newRoleId: string) {
    // 1. Check assigner can assign the new role
    const canAssign = await this.canAssignRole(assignerId, newRoleId);
    if (!canAssign) {
      throw new ForbiddenException('You are not allowed to assign this role');
    }

    // 2. Get assigner's church from active membership
    const assignerChurchId = await this.getUserChurchId(assignerId);
    if (!assignerChurchId) {
      throw new ForbiddenException('You are not associated with any church');
    }

    // 3. Verify target user belongs to same church
    const targetMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        church_id: assignerChurchId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!targetMembership) {
      throw new ForbiddenException('User does not belong to your church');
    }

    // Get target user info
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true },
    });

    // Get the role
    const role = await this.prisma.role.findUnique({
      where: { id: newRoleId },
      select: { id: true, name: true, title: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Get previous role for audit log
    const previousAssignment = await this.prisma.roleUser.findFirst({
      where: {
        user_id: userId,
        churchId: assignerChurchId,
      },
      include: {
        role: {
          select: { id: true, name: true, title: true },
        },
      },
    });

    // 4. Replace role
    await this.prisma.roleUser.deleteMany({
      where: {
        user_id: userId,
        churchId: assignerChurchId,
      },
    });

    const newAssignment = await this.prisma.roleUser.create({
      data: {
        user_id: userId,
        role_id: newRoleId,
        assigned_by_id: assignerId,
        churchId: assignerChurchId,
      },
      include: { role: true },
    });

    // 5. Update church_member's church_role if needed
    if (role.name === 'HELPER') {
      await this.prisma.churchMember.update({
        where: { id: targetMembership.id },
        data: { church_role: 'Helper' },
      });
    } else if (role.name === 'CHURCH_MEMBER') {
      await this.prisma.churchMember.update({
        where: { id: targetMembership.id },
        data: { church_role: 'Member' },
      });
    }

    // Create audit log
    const targetName = targetUser
      ? `${targetUser.first_name} ${targetUser.last_name}`.trim()
      : userId;
    const roleTitle = role.title || role.name;
    const previousRoleTitle =
      previousAssignment?.role?.title ||
      previousAssignment?.role?.name ||
      'none';

    await this.createAuditLog(
      assignerId,
      'UPDATED_USER_ROLE',
      `${targetName} → ${roleTitle} (was: ${previousRoleTitle})`,
      assignerChurchId,
      null,
    );

    return {
      message: 'Role updated successfully',
      data: {
        role_id: newAssignment.role_id,
        user_id: newAssignment.user_id,
        role: newAssignment.role,
        churchId: assignerChurchId,
        assigned_by_id: newAssignment.assigned_by_id,
        created_at: newAssignment.created_at,
      },
    };
  }

  // Remove role from a user (revoke all)
  async removeRole(assignerId: string, userId: string) {
    // Get assigner's church from active membership
    const assignerChurchId = await this.getUserChurchId(assignerId);
    if (!assignerChurchId) {
      throw new ForbiddenException('You are not associated with any church');
    }

    // Verify target user belongs to same church
    const targetMembership = await this.prisma.churchMember.findFirst({
      where: {
        user_id: userId,
        church_id: assignerChurchId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
    });

    if (!targetMembership) {
      throw new ForbiddenException('User does not belong to your church');
    }

    // Get target user info and previous role
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true },
    });

    const previousAssignment = await this.prisma.roleUser.findFirst({
      where: {
        user_id: userId,
        churchId: assignerChurchId,
      },
      include: {
        role: {
          select: { id: true, name: true, title: true },
        },
      },
    });

    // Remove role assignment
    await this.prisma.roleUser.deleteMany({
      where: {
        user_id: userId,
        churchId: assignerChurchId,
      },
    });

    // Update church_member's church_role to default
    await this.prisma.churchMember.update({
      where: { id: targetMembership.id },
      data: { church_role: 'Regular Member' },
    });

    // Create audit log
    const targetName = targetUser
      ? `${targetUser.first_name} ${targetUser.last_name}`.trim()
      : userId;
    const previousRoleTitle =
      previousAssignment?.role?.title ||
      previousAssignment?.role?.name ||
      'unknown';

    await this.createAuditLog(
      assignerId,
      'REVOKED_ROLE',
      `${targetName} - removed role: ${previousRoleTitle}`,
      assignerChurchId,
      null,
    );

    return { message: 'Role removed successfully' };
  }

  // Helper: check if a user (by id) can assign a given roleId
  private async canAssignRole(
    userId: string,
    targetRoleId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles_assigned_to_me: {
          include: { role: true },
          where: { churchId: { not: null } },
        },
      },
    });

    if (!user) return false;

    // Super admin or system admin can assign anything
    if (user.type === 'SUPER_ADMIN' || user.type === 'ADMIN') return true;

    const userRoleIds = user.roles_assigned_to_me.map((ru) => ru.role_id);

    if (userRoleIds.length === 0) return false;

    const rule = await this.prisma.roleAssignmentRule.findFirst({
      where: {
        from_role_id: { in: userRoleIds },
        to_role_id: targetRoleId,
      },
    });

    return !!rule;
  }

  // Get user's current role in their church
  async getUserChurchRole(userId: string, churchId: string) {
    const roleAssignment = await this.prisma.roleUser.findFirst({
      where: {
        user_id: userId,
        churchId: churchId,
      },
      include: {
        role: true,
      },
    });

    return roleAssignment?.role || null;
  }

  // Get all members of a specific church with their roles
  async getChurchMembersWithRoles(churchId: string) {
    const members = await this.prisma.churchMember.findMany({
      where: {
        church_id: churchId,
        status: ChurchMemberStatus.ACTIVE,
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            status: true,
            roles_assigned_to_me: {
              where: { churchId: churchId },
              include: {
                role: true,
                assigned_by: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    return members.map((member) => ({
      membershipId: member.id,
      user: member.user,
      church_role: member.church_role,
      joined_at: member.joined_at,
      approved_at: member.approved_at,
      approved_by: member.approved_by,
      assigned_role: member.user.roles_assigned_to_me[0]?.role || null,
      assigned_by: member.user.roles_assigned_to_me[0]?.assigned_by || null,
    }));
  }
}
