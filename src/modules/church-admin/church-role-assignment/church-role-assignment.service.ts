import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ChurchMemberStatus } from 'prisma/generated/enums';

@Injectable()
export class ChurchRoleAssignmentService {
  constructor(private prisma: PrismaService) {} // Remove MailService for now

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
      select: { id: true, name: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

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
      // TODO: Implement email sending
      // await this.mailService.sendMail(...)
      console.log(
        `Email would be sent to ${targetUser.email} about role assignment`,
      );
    }

    return {
      message: 'Role assigned successfully',
      data: {
        // RoleUser doesn't have an id field (composite key), so we use role_id and user_id
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

    // Get the role
    const role = await this.prisma.role.findUnique({
      where: { id: newRoleId },
      select: { id: true, name: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

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
