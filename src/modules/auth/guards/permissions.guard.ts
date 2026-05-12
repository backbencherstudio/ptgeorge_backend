import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Read what permission this route requires
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission decorator → allow through
    if (!required) return true;

    // 2. Get the authenticated user from JWT (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('User not authenticated');

    // 3. SUPER_ADMIN bypasses all permission checks
    if (user.type === 'SUPER_ADMIN') return true;

    // 4. Load all permissions assigned to this user through their roles
    const roleUsers = await this.prisma.roleUser.findMany({
      where: { user_id: user.userId },
      include: {
        role: {
          include: {
            permission_roles: {
              include: {
                permission: {
                  select: {
                    action: true,
                    category: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 5. Flatten all permissions across all roles
    const allPermissions = roleUsers.flatMap((ru) =>
      ru.role.permission_roles.map((pr) => pr.permission),
    );

    // 6. Check action + category both match, and permission is ACTIVE
    const hasPermission = allPermissions.some(
      (p) =>
        p.status === 'ACTIVE' &&
        p.action === required.action &&
        p.category === required.category,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to perform "${required.action}" on "${required.category}"`,
      );
    }

    return true;
  }
}
