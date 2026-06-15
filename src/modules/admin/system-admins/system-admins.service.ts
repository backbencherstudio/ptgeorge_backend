import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from 'src/modules/application/audit-log/audit-log.service';
import {
  CreateSystemAdminDto,
  UpdateSystemAdminDto,
} from './dto/create-system-admin.dto';
import { randomUUID } from 'crypto';
import { UserStatus, UserType } from 'prisma/generated/enums';

@Injectable()
export class SystemAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Helper: Create audit log ──────────────────────────────────────────────
  private async createAuditLog(
    userId: string | undefined,
    action: string,
    target: string,
    churchId?: string | null,
    churchName?: string | null,
  ) {
    try {
      if (!userId) return;
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { churchUser: true },
      });
      if (!user) return;

      let actorName: string = user.type || 'SYSTEM';
      if (user.first_name && user.last_name)
        actorName = `${user.first_name} ${user.last_name}`;
      else if (user.first_name) actorName = user.first_name;

      let finalChurchName = churchName;
      let finalChurchId = churchId;

      if (churchId && !finalChurchName) {
        const church = await this.prisma.church.findUnique({
          where: { id: churchId },
        });
        if (church) finalChurchName = church.church_name;
      }

      if (
        user.type === 'CHURCH_ADMIN' &&
        !finalChurchId &&
        user.churchUser?.length > 0
      ) {
        finalChurchId = user.churchUser[0].id;
        finalChurchName = user.churchUser[0].church_name;
      }

      await this.auditLogService.createLog({
        actor: actorName,
        action,
        target,
        church: finalChurchName || '--',
        actor_id: userId,
        actor_type: user.type || 'SYSTEM',
        church_id: finalChurchId || null,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  // ─── Helper: Get admin role ────────────────────────────────────────────────
  private async getOrCreateAdminRole(userId: string, userName: string) {
    const roleName = `admin_role_${userId}`;
    let role = await this.prisma.role.findFirst({
      where: { name: roleName, deleted_at: null },
    });

    if (!role) {
      role = await this.prisma.role.create({
        data: {
          id: randomUUID(),
          title: `Admin Role - ${userName}`,
          name: roleName,
          description: `Personal role for system admin ${userName}`,
          color: '#FF6B6B',
          status: 1,
        },
      });
    }
    return role;
  }

  // ─── Helper: Sync permissions for admin ────────────────────────────────────
  private async syncAdminPermissions(
    userId: string,
    userName: string,
    permissionIds: string[],
  ) {
    if (!permissionIds.length) return;

    // Validate all permission IDs exist and are active
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds }, deleted_at: null, status: 'ACTIVE' },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = new Set(permissions.map((p) => p.id));
      const missing = permissionIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Permission IDs not found or inactive: ${missing.join(', ')}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const role = await this.getOrCreateAdminRole(userId, userName);
      const roleId = role.id;

      // Replace all permissions
      await tx.permissionRole.deleteMany({
        where: { role_id: roleId },
      });

      if (permissionIds.length > 0) {
        await tx.permissionRole.createMany({
          data: permissionIds.map((permId) => ({
            permission_id: permId,
            role_id: roleId,
          })),
        });
      }

      // Ensure user is assigned this role
      const existingAssignment = await tx.roleUser.findUnique({
        where: { role_id_user_id: { role_id: roleId, user_id: userId } },
      });

      if (!existingAssignment) {
        await tx.roleUser.create({
          data: {
            role_id: roleId,
            user_id: userId,
            assigned_by_id: userId,
          },
        });
      }
    });
  }

  // ─── Helper: Get roles include for queries ─────────────────────────────────
  private get rolesInclude() {
    return {
      roles_assigned_to_me: {
        where: {
          role: {
            name: { startsWith: 'admin_role_' },
          },
        },
        include: {
          role: {
            include: {
              permission_roles: {
                include: {
                  permission: {
                    select: {
                      id: true,
                      title: true,
                      name: true,
                      action: true,
                      category: true,
                      status: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  // ─── Helper: Format user response ──────────────────────────────────────────
  private formatUser(user: any) {
    const permissionsMap = new Map<string, any>();
    const permissionsByCategory: Record<string, any[]> = {};

    if (user.roles_assigned_to_me) {
      for (const roleUser of user.roles_assigned_to_me) {
        if (roleUser.role?.permission_roles) {
          for (const permRole of roleUser.role.permission_roles) {
            if (permRole.permission) {
              const perm = permRole.permission;
              permissionsMap.set(perm.id, perm);

              // Group by category
              const category = perm.category || 'Uncategorized';
              if (!permissionsByCategory[category]) {
                permissionsByCategory[category] = [];
              }
              permissionsByCategory[category].push({
                id: perm.id,
                title: perm.title,
                name: perm.name,
                action: perm.action,
                category: perm.category,
                description: perm.description,
              });
            }
          }
        }
      }
    }

    const permissions = Array.from(permissionsMap.values());

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      type: user.type,
      status: user.status,
      language: user.language,
      avatar: user.avatar,
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_verified_at: user.email_verified_at,
      total_permissions: permissions.length,
      permissions_by_category: permissionsByCategory,
      permissions: permissions.map((p) => ({
        id: p.id,
        title: p.title,
        name: p.name,
        action: p.action,
        category: p.category,
        description: p.description,
      })),
      permission_ids: permissions.map((p) => p.id),
    };
  }

  // ─── Helper: Fetch admin with permissions ──────────────────────────────────
  private async getAdminWithPermissions(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null, type: UserType.ADMIN },
      include: this.rolesInclude,
    });
    if (!user)
      throw new NotFoundException(`System admin with id "${userId}" not found`);
    return this.formatUser(user);
  }

  // ─── CREATE ────────────────────────────────────────────────────────────────
  async create(dto: CreateSystemAdminDto, createdByUserId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException(
        `User with email "${dto.email}" already exists`,
      );

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const userName = `${dto.first_name} ${dto.last_name}`;

    // Determine which permissions to assign
    let permissionIds: string[] = [];

    if (dto.categories && dto.categories.length > 0) {
      // Get all permissions from selected categories
      const permissionsByCategory = await this.prisma.permission.findMany({
        where: {
          category: { in: dto.categories },
          deleted_at: null,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      permissionIds = permissionsByCategory.map((p) => p.id);

      if (permissionIds.length === 0) {
        throw new BadRequestException(
          `No permissions found for categories: ${dto.categories.join(', ')}`,
        );
      }
    } else if (dto.permissions && dto.permissions.length > 0) {
      permissionIds = dto.permissions;
    }

    // Use transaction for user creation and permission sync
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user with type: ADMIN
      const user = await tx.user.create({
        data: {
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email,
          password: hashedPassword,
          phone_number: dto.phone_number || '',
          church_name: '',
          language: dto.language || 'en',
          type: UserType.ADMIN,
          status: dto.status || UserStatus.ACTIVE,
          email_verified_at: new Date(),
        },
      });

      // Create admin role
      const role = await tx.role.create({
        data: {
          id: randomUUID(),
          title: `Admin Role - ${userName}`,
          name: `admin_role_${user.id}`,
          description: `Custom role for system admin ${userName} with ${permissionIds.length} permissions`,
          color: '#FF6B6B',
          status: 1,
        },
      });

      // Assign permissions to role
      if (permissionIds.length > 0) {
        await tx.permissionRole.createMany({
          data: permissionIds.map((permissionId) => ({
            permission_id: permissionId,
            role_id: role.id,
          })),
        });
      }

      // Assign role to user
      await tx.roleUser.create({
        data: {
          role_id: role.id,
          user_id: user.id,
          assigned_by_id: createdByUserId,
        },
      });

      return user;
    });

    await this.createAuditLog(
      createdByUserId,
      'CREATED_ADMIN',
      `Created system admin: ${userName} (${dto.email}) with ${permissionIds.length} permissions${dto.categories ? ` from categories: ${dto.categories.join(', ')}` : ''}`,
      null,
      '--',
    );

    return {
      success: true,
      message: 'System admin created successfully',
      data: await this.getAdminWithPermissions(result.id),
    };
  }

  // ─── GET AVAILABLE CATEGORIES ──────────────────────────────────────────────
  async getAvailableCategories() {
    const categories = await this.prisma.permission.findMany({
      where: {
        deleted_at: null,
        status: 'ACTIVE',
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    // Get permission count per category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await this.prisma.permission.count({
          where: {
            category: cat.category,
            deleted_at: null,
            status: 'ACTIVE',
          },
        });

        return {
          category: cat.category || 'Uncategorized',
          permission_count: count,
        };
      }),
    );

    return categoriesWithCount;
  }

  // ─── FIND ALL ──────────────────────────────────────────────────────────────
  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null, type: UserType.ADMIN };

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.rolesInclude,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      message: 'System admins fetched successfully',
      data: {
        items: users.map((u) => this.formatUser(u)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── FIND ONE ──────────────────────────────────────────────────────────────
  async findOne(id: string) {
    return {
      success: true,
      message: 'System admin fetched successfully',
      data: await this.getAdminWithPermissions(id),
    };
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateSystemAdminDto,
    updatedByUserId?: string,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, deleted_at: null, type: UserType.ADMIN },
    });
    if (!existingUser)
      throw new NotFoundException(`System admin with id "${id}" not found`);

    if (dto.email && dto.email !== existingUser.email) {
      const emailConflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailConflict)
        throw new ConflictException(
          `User with email "${dto.email}" already exists`,
        );
    }

    const updateData: any = { updated_at: new Date() };
    if (dto.first_name !== undefined) updateData.first_name = dto.first_name;
    if (dto.last_name !== undefined) updateData.last_name = dto.last_name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone_number !== undefined)
      updateData.phone_number = dto.phone_number;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);

    const changes: string[] = [];
    if (dto.first_name && dto.first_name !== existingUser.first_name)
      changes.push(
        `first_name: ${existingUser.first_name} → ${dto.first_name}`,
      );
    if (dto.last_name && dto.last_name !== existingUser.last_name)
      changes.push(`last_name: ${existingUser.last_name} → ${dto.last_name}`);
    if (dto.email && dto.email !== existingUser.email)
      changes.push(`email: ${existingUser.email} → ${dto.email}`);
    if (dto.status && dto.status !== existingUser.status)
      changes.push(`status: ${existingUser.status} → ${dto.status}`);

    // Use transaction for update
    const result = await this.prisma.$transaction(async (tx) => {
      // Update user
      const user = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Update permissions if provided
      if (dto.permissions !== undefined) {
        const userName = `${user.first_name} ${user.last_name}`;
        await this.syncAdminPermissions(id, userName, dto.permissions || []);
        changes.push(
          `permissions updated (${dto.permissions?.length || 0} assigned)`,
        );
      }

      return user;
    });

    await this.createAuditLog(
      updatedByUserId,
      'UPDATED_ADMIN',
      `Updated system admin: ${result.first_name} ${result.last_name}${changes.length ? ` (${changes.join(', ')})` : ''}`,
      null,
      '--',
    );

    return {
      success: true,
      message: 'System admin updated successfully',
      data: await this.getAdminWithPermissions(id),
    };
  }

  // ─── TOGGLE STATUS ─────────────────────────────────────────────────────────
  async toggleStatus(id: string, updatedByUserId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null, type: UserType.ADMIN },
    });
    if (!user)
      throw new NotFoundException(`System admin with id "${id}" not found`);

    const newStatus =
      user.status === UserStatus.ACTIVE
        ? UserStatus.SUSPENDED
        : UserStatus.ACTIVE;
    const statusMessage =
      newStatus === UserStatus.ACTIVE ? 'activated' : 'suspended';

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: newStatus, updated_at: new Date() },
    });

    await this.createAuditLog(
      updatedByUserId,
      newStatus === UserStatus.ACTIVE ? 'ACTIVATED_ADMIN' : 'SUSPENDED_ADMIN',
      `${user.first_name} ${user.last_name} was ${statusMessage}`,
      null,
      '--',
    );

    return {
      success: true,
      message: `System admin ${statusMessage} successfully`,
      data: { id: updated.id, status: updated.status },
    };
  }

  // ─── DELETE (SOFT) ─────────────────────────────────────────────────────────
  async remove(id: string, deletedByUserId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null, type: UserType.ADMIN },
    });
    if (!user)
      throw new NotFoundException(`System admin with id "${id}" not found`);
    if (deletedByUserId === id)
      throw new ForbiddenException('You cannot delete your own admin account');

    await this.prisma.user.update({
      where: { id },
      data: { deleted_at: new Date(), status: UserStatus.SUSPENDED },
    });

    await this.createAuditLog(
      deletedByUserId,
      'DELETED_ADMIN',
      `Deleted system admin: ${user.first_name} ${user.last_name} (${user.email})`,
      null,
      '--',
    );

    return { success: true, message: 'System admin deleted successfully' };
  }
}
