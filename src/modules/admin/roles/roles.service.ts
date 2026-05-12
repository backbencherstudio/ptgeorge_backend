import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-roles.dto';
import { UpdateRoleDto } from './dto/update-roles.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helper: slugify title into name ─────────────────────────────────────────
  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────
  async create(dto: CreateRoleDto) {
    const name = this.slugify(dto.title);

    // Check for duplicate name
    const existing = await this.prisma.role.findFirst({
      where: { name, deleted_at: null },
    });

    if (existing) {
      throw new ConflictException(
        `A role with the name "${name}" already exists`,
      );
    }

    const role = await this.prisma.role.create({
      data: {
        title: dto.title,
        name,
        description: dto.description,
        color: dto.color,
      },
    });

    return {
      message: 'Role created successfully',
      data: role,
    };
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────────────
  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: {
        _count: {
          select: { permission_roles: true, role_users: true },
        },
        permission_roles: {
          include: {
            permission: {
              select: {
                id: true,
                title: true,
                action: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Roles fetched successfully',
      data: roles.map((role) => ({
        id: role.id,
        title: role.title,
        name: role.name,
        description: role.description,
        color: role.color,
        status: role.status,
        created_at: role.created_at,
        permission_count: role._count.permission_roles,
        user_count: role._count.role_users,
        permissions: role.permission_roles.map((pr) => pr.permission),
      })),
    };
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deleted_at: null },
      include: {
        permission_roles: {
          include: {
            permission: true,
          },
        },
        role_users: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }

    return {
      message: 'Role fetched successfully',
      data: role,
    };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }

    // Prevent updating system roles' name/title
    const systemRoles = ['super_admin', 'system_admin'];
    if (systemRoles.includes(role.name ?? '') && dto.title) {
      throw new BadRequestException('System role titles cannot be changed');
    }

    const updatedName = dto.title ? this.slugify(dto.title) : role.name;

    // Check name conflict if title is changing
    if (dto.title && updatedName !== role.name) {
      const conflict = await this.prisma.role.findFirst({
        where: { name: updatedName, deleted_at: null, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `A role with the name "${updatedName}" already exists`,
        );
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        title: dto.title ?? role.title,
        name: updatedName,
        updated_at: new Date(),
        color: dto.color ?? role.color,
        description: dto.description ?? role.description,
      },
    });

    return {
      message: 'Role updated successfully',
      data: updated,
    };
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────
  async remove(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deleted_at: null },
      include: {
        _count: { select: { role_users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }

    // Block deleting system roles
    const systemRoles = ['super_admin', 'system_admin'];
    if (systemRoles.includes(role.name ?? '')) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Block if users are still assigned
    if (role._count.role_users > 0) {
      throw new BadRequestException(
        `Cannot delete role — ${role._count.role_users} user(s) are assigned to it. Reassign them first.`,
      );
    }

    await this.prisma.role.update({
      where: { id },
      data: { deleted_at: new Date(), status: 0 },
    });

    return { message: 'Role deleted successfully' };
  }

  // ─── SUSPEND / ACTIVATE ──────────────────────────────────────────────────────
  async toggleStatus(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }

    const systemRoles = ['super_admin', 'system_admin'];
    if (systemRoles.includes(role.name ?? '')) {
      throw new BadRequestException('System role status cannot be changed');
    }

    const newStatus = role.status === 1 ? 0 : 1;

    const updated = await this.prisma.role.update({
      where: { id },
      data: { status: newStatus, updated_at: new Date() },
    });

    return {
      message: `Role ${newStatus === 1 ? 'activated' : 'suspended'} successfully`,
      data: updated,
    };
  }

  // ─── ASSIGN PERMISSIONS TO ROLE ───────────────────────────────────────────────
  async assignPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${roleId}" not found`);
    }

    // Validate all permission IDs exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds }, deleted_at: null },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException(
        'One or more permission IDs are invalid or do not exist',
      );
    }

    // Full replace: delete existing then insert new
    await this.prisma.$transaction([
      this.prisma.permissionRole.deleteMany({ where: { role_id: roleId } }),
      this.prisma.permissionRole.createMany({
        data: permissionIds.map((permission_id) => ({
          role_id: roleId,
          permission_id,
        })),
      }),
    ]);

    return {
      message: `${permissionIds.length} permission(s) assigned to role successfully`,
    };
  }
}
