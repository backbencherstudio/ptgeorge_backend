// src/modules/church-admin/church-role-assignment/church-role-assignment.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';

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

  // List all users of the same church with their current role
  async getChurchUsers(currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { church_id: true },
    });
    if (!currentUser?.church_id)
      throw new ForbiddenException('User has no church');

    const users = await this.prisma.user.findMany({
      where: { church_id: currentUser.church_id, deleted_at: null },
      include: {
        roles_assigned_to_me: {
          include: {
            role: true,
            assigned_by: { select: { first_name: true, last_name: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 1, // if we enforce one role per user
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone_number,
      joinedAt: user.created_at,
      currentRole: user.roles_assigned_to_me[0]?.role || null,
      assignedBy: user.roles_assigned_to_me[0]?.assigned_by || null,
      assignedAt: user.roles_assigned_to_me[0]?.created_at || null,
    }));
  }

  // Assign a role to a user (replaces any existing role)
  async assignRole(assignerId: string, dto: AssignRoleDto) {
    const { userId, roleId, sendEmail } = dto;

    // 1. Check assigner permissions
    const canAssign = await this.canAssignRole(assignerId, roleId);
    if (!canAssign)
      throw new ForbiddenException('You are not allowed to assign this role');

    // 2. Check that target user belongs to same church
    const assigner = await this.prisma.user.findUnique({
      where: { id: assignerId },
      select: { church_id: true },
    });
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        church_id: true,
        email: true,
        first_name: true,
      },
    });
    if (!targetUser) throw new NotFoundException('Target user not found');
    if (assigner?.church_id !== targetUser.church_id) {
      throw new ForbiddenException('User does not belong to your church');
    }

    // Get the role to get church_id
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    // 3. Remove any existing role assignment for this user
    await this.prisma.roleUser.deleteMany({
      where: { user_id: userId },
    });

    // 4. Create new assignment
    const assignment = await this.prisma.roleUser.create({
      data: {
        user_id: userId,
        role_id: roleId,
        assigned_by_id: assignerId,
        churchId: assigner?.church_id, // Link to the church
      },
      include: { role: true, user: true },
    });

    // 5. Send email notification if requested (implement if needed)
    if (sendEmail) {
      // TODO: Implement email sending
      // await this.mailService.sendMail(...)
      console.log(
        `Email would be sent to ${targetUser.email} about role assignment`,
      );
    }

    return { message: 'Role assigned successfully', data: assignment };
  }

  // Update a user's role (replace current role with a new one)
  async updateUserRole(assignerId: string, userId: string, newRoleId: string) {
    // 1. Check assigner can assign the new role
    const canAssign = await this.canAssignRole(assignerId, newRoleId);
    if (!canAssign)
      throw new ForbiddenException('You are not allowed to assign this role');

    // 2. Verify same church
    const assigner = await this.prisma.user.findUnique({
      where: { id: assignerId },
      select: { church_id: true },
    });
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { church_id: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');
    if (assigner?.church_id !== targetUser.church_id) {
      throw new ForbiddenException('User does not belong to your church');
    }

    // Get the role to get church_id
    const role = await this.prisma.role.findUnique({
      where: { id: newRoleId },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    // 3. Replace role
    await this.prisma.roleUser.deleteMany({ where: { user_id: userId } });
    const newAssignment = await this.prisma.roleUser.create({
      data: {
        user_id: userId,
        role_id: newRoleId,
        assigned_by_id: assignerId,
        churchId: assigner?.church_id,
      },
      include: { role: true },
    });

    return { message: 'Role updated successfully', data: newAssignment };
  }

  // Remove role from a user (revoke all)
  async removeRole(assignerId: string, userId: string) {
    // Verify same church
    const assigner = await this.prisma.user.findUnique({
      where: { id: assignerId },
      select: { church_id: true },
    });
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { church_id: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');
    if (assigner?.church_id !== targetUser.church_id) {
      throw new ForbiddenException('User does not belong to your church');
    }

    await this.prisma.roleUser.deleteMany({ where: { user_id: userId } });
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
        },
      },
    });
    if (!user) return false;

    // Super admin or system admin can assign anything
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
}
