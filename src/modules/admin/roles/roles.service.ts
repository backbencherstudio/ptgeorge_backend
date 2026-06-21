import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-roles.dto';
import { UpdateRoleDto } from './dto/update-roles.dto';
import { AuditLogService } from 'src/modules/application/audit-log/audit-log.service';
import { sendAdminNotification } from 'src/common/repository/notification/utils/notification.utils';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Helper: slugify title into name ─────────────────────────────────────────
  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
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
  async create(dto: CreateRoleDto, userId?: string) {
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

    // Create audit log
    await this.createAuditLog(
      userId,
      'CREATED_ROLE',
      `${role.title} (${role.name})`,
      null,
      '--',
    );

    await sendAdminNotification({
        sender_id: userId,
        text: `Role "${role.title}" has been created`,
        type: 'role_created',
        entity_id: role.id,
    })

    return {
      message: 'Role created successfully',
      data: role,
    };
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────────────
  async findAll(fields?: string[] | null) {
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

    // Transform roles based on requested fields
    let data: any[] = roles.map((role) => ({
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
    }));

    // Apply field filtering if fields parameter is provided
    if (fields && fields.length > 0) {
      data = data.map((role) => {
        const filteredRole: Record<string, any> = {};
        fields.forEach((field) => {
          if (field in role) {
            filteredRole[field] = role[field];
          }
        });
        return filteredRole;
      });
    }

    return {
      message: 'Roles fetched successfully',
      data,
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
  async update(id: string, dto: UpdateRoleDto, userId?: string) {
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

    // Create audit log
    const changes = [];
    if (dto.title && dto.title !== role.title)
      changes.push(`title: ${role.title} → ${dto.title}`);
    if (dto.description && dto.description !== role.description)
      changes.push(`description updated`);
    if (dto.color && dto.color !== role.color) changes.push(`color updated`);

    const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
    await this.createAuditLog(
      userId,
      'UPDATED_ROLE',
      `${role.title} → ${updated.title}${changeText}`,
      null,
      '--',
    );

    return {
      message: 'Role updated successfully',
      data: updated,
    };
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────
  async remove(id: string, userId?: string) {
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

    // Create audit log
    await this.createAuditLog(
      userId,
      'DELETED_ROLE',
      `${role.title} (${role.name})`,
      null,
      '--',
    );

    return { message: 'Role deleted successfully' };
  }

  // ─── SUSPEND / ACTIVATE ──────────────────────────────────────────────────────
  async toggleStatus(id: string, userId?: string) {
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
    const statusAction = newStatus === 1 ? 'ACTIVATED_ROLE' : 'SUSPENDED_ROLE';
    const statusMessage = newStatus === 1 ? 'activated' : 'suspended';

    const updated = await this.prisma.role.update({
      where: { id },
      data: { status: newStatus, updated_at: new Date() },
    });

    // Create audit log
    await this.createAuditLog(
      userId,
      statusAction,
      `${role.title} (${role.name}) was ${statusMessage}`,
      null,
      '--',
    );

    return {
      message: `Role ${statusMessage} successfully`,
      data: updated,
    };
  }

  // ─── ASSIGN PERMISSIONS TO ROLE ───────────────────────────────────────────────
  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    userId?: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${roleId}" not found`);
    }

    // Get existing permissions before update
    const existingPermissions = await this.prisma.permissionRole.findMany({
      where: { role_id: roleId },
      include: { permission: true },
    });
    const existingPermissionIds = existingPermissions.map(
      (ep) => ep.permission_id,
    );

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

    // Determine what changed
    const addedPermissions = permissionIds.filter(
      (id) => !existingPermissionIds.includes(id),
    );
    const removedPermissions = existingPermissionIds.filter(
      (id) => !permissionIds.includes(id),
    );

    const addedNames = permissions
      .filter((p) => addedPermissions.includes(p.id))
      .map((p) => p.title || p.name)
      .join(', ');

    const removedNames = existingPermissions
      .filter((ep) => removedPermissions.includes(ep.permission_id))
      .map((ep) => ep.permission.title || ep.permission.name)
      .join(', ');

    let changeDescription = '';
    if (addedNames && removedNames) {
      changeDescription = `Added: ${addedNames}, Removed: ${removedNames}`;
    } else if (addedNames) {
      changeDescription = `Added ${addedPermissions.length} permission(s): ${addedNames}`;
    } else if (removedNames) {
      changeDescription = `Removed ${removedPermissions.length} permission(s): ${removedNames}`;
    } else {
      changeDescription = `${permissionIds.length} permission(s) assigned (no changes from previous)`;
    }

    // Create audit log
    await this.createAuditLog(
      userId,
      'ASSIGNED_PERMISSIONS_TO_ROLE',
      `${role.title} (${role.name}) - ${changeDescription}`,
      null,
      '--',
    );

    return {
      message: `${permissionIds.length} permission(s) assigned to role successfully`,
    };
  }
}
