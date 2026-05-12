import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionAction } from 'prisma/generated/enums';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helper: auto-generate permission key from action + category ──────────────
  // e.g. action="manage" + category="Church" → "manage_church"
  private generateKey(action: string, category: string): string {
    return `${action}_${category.toLowerCase().replace(/\s+/g, '_')}`;
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────
  async create(dto: CreatePermissionDto) {
    const name = this.generateKey(dto.action, dto.category);

    // Reject duplicate keys
    const existing = await this.prisma.permission.findFirst({
      where: { name, deleted_at: null },
    });
    if (existing) {
      throw new ConflictException(
        `A permission with key "${name}" already exists`,
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        title: dto.title,
        name, // auto-generated key e.g. "manage_church"
        action: dto.action, // "manage"
        category: dto.category, // "Church" — used for UI grouping
        description: dto.description,
        status: 'ACTIVE',
      },
    });

    return {
      message: 'Permission created successfully',
      data: permission,
    };
  }

  // ─── FIND ALL (grouped by category) ──────────────────────────────────────────
  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      where: { deleted_at: null },
      orderBy: [{ category: 'asc' }, { created_at: 'asc' }],
      include: {
        permission_roles: {
          include: {
            role: {
              select: { id: true, title: true, name: true },
            },
          },
        },
      },
    });

    // Group by category for UI display (e.g. "Church (3)", "Users (2)")
    const grouped = permissions.reduce(
      (acc, perm) => {
        const cat = perm.category ?? 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
          id: perm.id,
          title: perm.title,
          name: perm.name, // the key shown in UI e.g. "manage_church"
          action: perm.action,
          category: perm.category,
          description: perm.description,
          status: perm.status,
          created_at: perm.created_at,
          used_by_roles: perm.permission_roles.map((pr) => pr.role),
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return {
      message: 'Permissions fetched successfully',
      data: grouped,
    };
  }

  // ─── FIND ALL FLAT (for assign-permissions dropdown) ─────────────────────────
  async findAllFlat() {
    const permissions = await this.prisma.permission.findMany({
      where: { deleted_at: null, status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        name: true,
        action: true,
        category: true,
      },
    });

    return {
      message: 'Permissions fetched successfully',
      data: permissions,
    };
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deleted_at: null },
      include: {
        permission_roles: {
          include: {
            role: {
              select: { id: true, title: true, name: true },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    return {
      message: 'Permission fetched successfully',
      data: {
        ...permission,
        used_by_roles: permission.permission_roles.map((pr) => pr.role),
      },
    };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deleted_at: null },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    // Recalculate key if action or category changes
    const newAction = dto.action ?? (permission.action as PermissionAction);
    const newCategory = dto.category ?? permission.category ?? '';
    const newName = this.generateKey(newAction, newCategory);

    // Check key conflict only if key is actually changing
    if (newName !== permission.name) {
      const conflict = await this.prisma.permission.findFirst({
        where: { name: newName, deleted_at: null, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `A permission with key "${newName}" already exists`,
        );
      }
    }

    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        title: dto.title ?? permission.title,
        name: newName,
        action: newAction,
        category: newCategory,
        description: dto.description ?? permission.description,
        updated_at: new Date(),
      },
    });

    return {
      message: 'Permission updated successfully',
      data: updated,
    };
  }

  // ─── TOGGLE STATUS (ACTIVE ↔ INACTIVE) ───────────────────────────────────────
  async toggleStatus(id: string) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deleted_at: null },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    const newStatus = permission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await this.prisma.permission.update({
      where: { id },
      data: { status: newStatus, updated_at: new Date() },
    });

    return {
      message: `Permission ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'} successfully`,
      data: updated,
    };
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────
  async remove(id: string) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deleted_at: null },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    // Also remove from all roles that use it (cascade handled by Prisma schema,
    // but soft delete won't trigger cascade — so we clean up manually)
    await this.prisma.$transaction([
      this.prisma.permissionRole.deleteMany({
        where: { permission_id: id },
      }),
      this.prisma.permission.update({
        where: { id },
        data: { deleted_at: new Date(), status: 'INACTIVE' },
      }),
    ]);

    return { message: 'Permission deleted successfully' };
  }
}
