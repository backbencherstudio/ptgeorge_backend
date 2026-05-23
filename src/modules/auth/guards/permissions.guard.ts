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
import { IS_PUBLIC_KEY } from 'src/common/guard/role/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ✅ Skip permission check for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 1. Read what permission this route requires
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission decorator → allow through
    if (!required) {
      return true;
    }

    // 2. Get authenticated user
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 3. SUPER_ADMIN bypass
    if (user.type === 'SUPER_ADMIN') {
      return true;
    }

    // 4. Load permissions
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

    // 5. Flatten permissions
    const allPermissions = roleUsers.flatMap((ru) =>
      ru.role.permission_roles.map((pr) => pr.permission),
    );

    // 6. Match permission
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
