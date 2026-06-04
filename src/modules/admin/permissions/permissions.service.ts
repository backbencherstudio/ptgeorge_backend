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
import { AuditLogService } from 'src/modules/application/audit-log/audit-log.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Helper: auto-generate permission key from action + category ──────────────
  // e.g. action="manage" + category="Church" → "manage_church"
  private generateKey(action: string, category: string): string {
    return `${action}_${category.toLowerCase().replace(/\s+/g, '_')}`;
  }

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
        console.log('No userId provided for audit log, skipping...');
        return;
      }

      // Fetch user details from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { churchUser: true },
      });

      if (!user) {
        console.log(`User with id ${userId} not found for audit log`);
        return;
      }

      // Get actor name (string, not UserType)
      let actorName: string = user.type; // Default to user type
      if (user.first_name && user.last_name) {
        actorName = `${user.first_name} ${user.last_name}`;
      } else if (user.first_name) {
        actorName = user.first_name;
      }

      // Get church info
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

      // If user is CHURCH_ADMIN and no church info provided, try to get from user
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
      console.error('Failed to create audit log:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────
  async create(dto: CreatePermissionDto, userId?: string) {
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

    // Create audit log
    await this.createAuditLog(
      userId,
      'CREATED_PERMISSION',
      `${permission.title} (${permission.name}) - ${permission.action} on ${permission.category}`,
      null,
      '--',
    );

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
  async update(id: string, dto: UpdatePermissionDto, userId?: string) {
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

    // Create audit log
    const changes = [];
    if (dto.title && dto.title !== permission.title)
      changes.push(`title: ${permission.title} → ${dto.title}`);
    if (dto.action && dto.action !== permission.action)
      changes.push(`action: ${permission.action} → ${dto.action}`);
    if (dto.category && dto.category !== permission.category)
      changes.push(`category: ${permission.category} → ${dto.category}`);
    if (dto.description && dto.description !== permission.description)
      changes.push(`description updated`);

    const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
    await this.createAuditLog(
      userId,
      'UPDATED_PERMISSION',
      `${permission.title} → ${updated.title}${changeText}`,
      null,
      '--',
    );

    return {
      message: 'Permission updated successfully',
      data: updated,
    };
  }

  // ─── TOGGLE STATUS (ACTIVE ↔ INACTIVE) ───────────────────────────────────────
  async toggleStatus(id: string, userId?: string) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deleted_at: null },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }

    const newStatus = permission.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const statusAction =
      newStatus === 'ACTIVE' ? 'ACTIVATED_PERMISSION' : 'SUSPENDED_PERMISSION';
    const statusMessage = newStatus === 'ACTIVE' ? 'activated' : 'suspended';

    const updated = await this.prisma.permission.update({
      where: { id },
      data: { status: newStatus, updated_at: new Date() },
    });

    // Create audit log
    await this.createAuditLog(
      userId,
      statusAction,
      `${permission.title} (${permission.name}) was ${statusMessage}`,
      null,
      '--',
    );

    return {
      message: `Permission ${statusMessage} successfully`,
      data: updated,
    };
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────
  async remove(id: string, userId?: string) {
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

    // Get roles that use this permission for audit log
    const affectedRoles = permission.permission_roles
      .map((pr) => pr.role.title || pr.role.name)
      .join(', ');
    const affectedRolesCount = permission.permission_roles.length;

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

    // Create audit log
    const targetText =
      affectedRolesCount > 0
        ? `${permission.title} (${permission.name}) - Removed from ${affectedRolesCount} role(s): ${affectedRoles}`
        : `${permission.title} (${permission.name})`;

    await this.createAuditLog(
      userId,
      'DELETED_PERMISSION',
      targetText,
      null,
      '--',
    );

    return { message: 'Permission deleted successfully' };
  }
}
