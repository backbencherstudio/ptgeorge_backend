// src/modules/church-members/church-members.service.ts
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

@Injectable()
export class ChurchMembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all members of the church where the admin belongs
   */
  async getChurchMembers(adminId: string, query: GetMembersDto) {
    // Get admin's church
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { church_id: true, type: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Super admin can see all members across churches
    if (admin.type === 'SUPER_ADMIN') {
      return this.getAllMembersForSuperAdmin(query);
    }

    // Regular admin must belong to a church
    if (!admin.church_id) {
      throw new ForbiddenException('You are not associated with any church');
    }

    const { page, limit, search, status, role, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      church_id: admin.church_id,
      deleted_at: null,
    };

    // Filter by status
    if (status) {
      where.status = status === 'active' ? 1 : 0;
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
        },
      };
    }

    // Get members with their roles
    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
            where: { churchId: admin.church_id },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Format members data
    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone_number,
      status: member.status === 1 ? 'Active' : 'Inactive',
      joined: member.created_at,
      role: member.roles_assigned_to_me[0]?.role?.title || 'No Role',
      role_name: member.roles_assigned_to_me[0]?.role?.name || null,
      assigned_by: member.roles_assigned_to_me[0]?.assigned_by || null,
      type: member.type,
    }));

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
      where.status = status === 'active' ? 1 : 0;
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
        orderBy: { [sortBy]: sortOrder },
        include: {
          church: { select: { church_name: true, id: true } },
          roles_assigned_to_me: {
            include: { role: true },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone_number,
      status: member.status === 1 ? 'Active' : 'Inactive',
      joined: member.created_at,
      church: member.church?.church_name || 'No Church',
      church_id: member.church?.id,
      role: member.roles_assigned_to_me[0]?.role?.title || 'No Role',
      role_name: member.roles_assigned_to_me[0]?.role?.name || null,
      type: member.type,
    }));

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
   * Add a new member to the church
   */
  async addMember(adminId: string, dto: CreateMemberDto) {
    // Get admin's church
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { church_id: true, type: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Super admin can add to any church, but need to specify church_id in dto
    if (admin.type === 'SUPER_ADMIN') {
      throw new BadRequestException('Super admin must specify church_id');
    }

    if (!admin.church_id) {
      throw new ForbiddenException('You are not associated with any church');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Get the role to assign
    const role = await this.prisma.role.findFirst({
      where: { name: dto.role_name, deleted_at: null },
    });

    if (!role) {
      throw new BadRequestException(`Role "${dto.role_name}" not found`);
    }

    // Check if admin can assign this role
    const canAssign = await this.canAssignRole(adminId, role.id);
    if (!canAssign) {
      throw new ForbiddenException(
        `You cannot assign the role "${dto.role_name}"`,
      );
    }

    // Generate password if not provided
    const password = dto.password || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get church details
    const church = await this.prisma.church.findUnique({
      where: { id: admin.church_id },
    });

    // Create user
    const user = await this.prisma.user.create({
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        phone_number: dto.phone_number,
        church_name: church?.church_name || '',
        language: 'en',
        password: hashedPassword,
        type: 'USER',
        status: 1,
        church_id: admin.church_id,
        email_verified_at: new Date(),
      },
    });

    // Assign role to user
    await this.prisma.roleUser.create({
      data: {
        role_id: role.id,
        user_id: user.id,
        assigned_by_id: adminId,
        churchId: admin.church_id,
      },
    });

    // Update church member count
    const memberCount = await this.prisma.user.count({
      where: { church_id: admin.church_id, deleted_at: null },
    });
    await this.prisma.church.update({
      where: { id: admin.church_id },
      data: { church_members: memberCount },
    });

    return {
      success: true,
      message: 'Member added successfully',
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone_number,
        role: role.title,
        role_name: role.name,
        temporary_password: dto.password ? undefined : password,
      },
    };
  }

  /**
   * Update a member
   */
  async updateMember(adminId: string, memberId: string, dto: UpdateMemberDto) {
    // Get admin's church
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { church_id: true, type: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Get the member
    const member = await this.prisma.user.findUnique({
      where: { id: memberId, deleted_at: null },
      include: { roles_assigned_to_me: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Super admin can edit anyone
    if (admin.type !== 'SUPER_ADMIN') {
      // Check if member belongs to admin's church
      if (member.church_id !== admin.church_id) {
        throw new ForbiddenException(
          'You cannot edit members from other churches',
        );
      }
    }

    // Update member data
    const updateData: any = {};
    if (dto.first_name) updateData.first_name = dto.first_name;
    if (dto.last_name) updateData.last_name = dto.last_name;
    if (dto.email) updateData.email = dto.email;
    if (dto.phone_number) updateData.phone_number = dto.phone_number;
    if (dto.status) {
      updateData.status = dto.status === 'active' ? 1 : 0;
    }

    const updatedMember = await this.prisma.user.update({
      where: { id: memberId },
      data: updateData,
    });

    // Update role if provided
    if (dto.role_name) {
      const newRole = await this.prisma.role.findFirst({
        where: { name: dto.role_name, deleted_at: null },
      });

      if (!newRole) {
        throw new BadRequestException(`Role "${dto.role_name}" not found`);
      }

      // Check if admin can assign this role
      const canAssign = await this.canAssignRole(adminId, newRole.id);
      if (!canAssign) {
        throw new ForbiddenException(
          `You cannot assign the role "${dto.role_name}"`,
        );
      }

      // Remove existing role assignment for this church
      await this.prisma.roleUser.deleteMany({
        where: {
          user_id: memberId,
          churchId: admin.church_id,
        },
      });

      // Assign new role
      await this.prisma.roleUser.create({
        data: {
          role_id: newRole.id,
          user_id: memberId,
          assigned_by_id: adminId,
          churchId: admin.church_id,
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
   * Remove a member from church (soft delete)
   */
  async removeMember(adminId: string, memberId: string) {
    // Get admin's church
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { church_id: true, type: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Get the member
    const member = await this.prisma.user.findUnique({
      where: { id: memberId, deleted_at: null },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Super admin can remove anyone
    if (admin.type !== 'SUPER_ADMIN') {
      // Check if member belongs to admin's church
      if (member.church_id !== admin.church_id) {
        throw new ForbiddenException(
          'You cannot remove members from other churches',
        );
      }
    }

    // Soft delete user
    await this.prisma.user.update({
      where: { id: memberId },
      data: { deleted_at: new Date(), status: 0 },
    });

    // Update church member count if member had a church
    if (member.church_id) {
      const memberCount = await this.prisma.user.count({
        where: { church_id: member.church_id, deleted_at: null },
      });
      await this.prisma.church.update({
        where: { id: member.church_id },
        data: { church_members: memberCount },
      });
    }

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  /**
   * Get member by ID
   */
  async getMemberById(adminId: string, memberId: string) {
    // Get admin's church
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { church_id: true, type: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Get the member
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
        church: { select: { church_name: true, id: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Super admin can view anyone
    if (admin.type !== 'SUPER_ADMIN') {
      // Check if member belongs to admin's church
      if (member.church_id !== admin.church_id) {
        throw new ForbiddenException(
          'You cannot view members from other churches',
        );
      }
    }

    const currentRole = member.roles_assigned_to_me[0];

    return {
      success: true,
      message: 'Member fetched successfully',
      data: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone_number,
        status: member.status === 1 ? 'Active' : 'Inactive',
        joined: member.created_at,
        church: member.church?.church_name,
        church_id: member.church_id,
        role: currentRole?.role?.title || 'No Role',
        role_name: currentRole?.role?.name || null,
        assigned_by: currentRole?.assigned_by || null,
        type: member.type,
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
