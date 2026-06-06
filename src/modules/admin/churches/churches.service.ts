// churches.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryChurchDto } from './dto/query-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { UpdateChurchStatusDto } from './dto/update-church-status.dto';
import { Prisma } from 'prisma/generated/client';
import { UserType } from 'prisma/generated/client';

@Injectable()
export class ChurchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryChurchDto) {
    const { page = 1, limit = 10, search, fields: fieldsString } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ChurchWhereInput = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { church_name: { contains: search, mode: 'insensitive' as const } },
        { church_city: { contains: search, mode: 'insensitive' as const } },
        { church_email: { contains: search, mode: 'insensitive' as const } },
        { church_domain: { contains: search, mode: 'insensitive' as const } },
        {
          church_adminname: { contains: search, mode: 'insensitive' as const },
        },
      ];
    }

    const allFields = {
      id: true,
      church_name: true,
      church_city: true,
      church_email: true,
      church_domain: true,
      church_adminname: true,
      church_address: true,
      church_description: true,
      church_phone: true,
      church_members: true,
      status: true,
      auth_type: true,
      created_at: true,
      updated_at: true,
    } as const;

    let select: Record<string, boolean>;

    if (fieldsString && fieldsString.trim()) {
      const requestedFields = fieldsString
        .split(',')
        .map((field) => field.trim());
      select = {};
      requestedFields.forEach((field) => {
        if (field in allFields) {
          select[field] = true;
        }
      });
      if (Object.keys(select).length === 0) {
        select = { ...allFields };
      }
    } else {
      select = { ...allFields };
    }

    const [data, total] = await Promise.all([
      this.prisma.church.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select,
      }),
      this.prisma.church.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve the actual church ID based on user role
   * - For SUPER_ADMIN: uses the provided ID
   * - For CHURCH_ADMIN: finds their associated church ID (ignores provided ID)
   */
  private async resolveChurchId(
    providedId: string,
    user: any,
  ): Promise<string> {
    // Fetch current user with role information
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        churchUser: true, // Get church associated with this user
        roles_assigned_to_me: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Check if user is SUPER_ADMIN
    const isSuperAdmin = currentUser.type === UserType.SUPER_ADMIN;

    // Check if user has CHURCH_ADMIN role
    const hasChurchAdminRole = currentUser.roles_assigned_to_me.some(
      (ra) =>
        ra.role?.name === 'CHURCH_ADMIN' || ra.role?.title === 'CHURCH_ADMIN',
    );

    if (isSuperAdmin) {
      // SUPER_ADMIN can update any church using the provided ID
      return providedId;
    }

    if (hasChurchAdminRole) {
      // CHURCH_ADMIN must update their own church
      if (!currentUser.churchUser || currentUser.churchUser.length === 0) {
        throw new ForbiddenException('You are not associated with any church');
      }

      // Get the church ID from the user's church association
      const churchId = currentUser.churchUser[0]?.id;

      if (!churchId) {
        throw new ForbiddenException('No church found for this admin');
      }

      return churchId;
    }

    throw new ForbiddenException(
      'You do not have permission to update churches',
    );
  }

  async findOne(id: string, user?: any) {
    let churchId = id;

    // If user is provided, resolve the correct church ID based on role
    if (user) {
      churchId = await this.resolveChurchId(id, user);
    }

    const church = await this.prisma.church.findFirst({
      where: {
        id: churchId,
        deleted_at: null,
      },
      select: {
        id: true,
        church_name: true,
        church_city: true,
        church_email: true,
        church_domain: true,
        church_adminname: true,
        church_address: true,
        church_description: true,
        church_phone: true,
        church_members: true,
        status: true,
        auth_type: true,
        created_at: true,
        updated_at: true,
        user_id: true,
      },
    });

    if (!church) throw new NotFoundException('Church not found');
    return church;
  }

  async update(id: string, dto: UpdateChurchDto, user: any) {
    // Resolve the actual church ID based on user role
    const churchId = await this.resolveChurchId(id, user);

    // Verify church exists
    await this.findOne(churchId, user);

    // Clean up undefined values to avoid overwriting with undefined
    const updateData: any = {};
    Object.keys(dto).forEach((key) => {
      if (dto[key as keyof UpdateChurchDto] !== undefined) {
        updateData[key] = dto[key as keyof UpdateChurchDto];
      }
    });

    const updated = await this.prisma.church.update({
      where: { id: churchId },
      data: updateData,
      select: {
        id: true,
        church_name: true,
        church_city: true,
        church_email: true,
        church_domain: true,
        church_address: true,
        church_description: true,
        church_phone: true,
        church_members: true,
        church_adminname: true,
        status: true,
        auth_type: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      message: 'Church updated successfully',
      data: updated,
    };
  }

  async updateStatus(id: string, dto: UpdateChurchStatusDto, user: any) {
    // Resolve the actual church ID based on user role
    const churchId = await this.resolveChurchId(id, user);

    // Verify church exists
    await this.findOne(churchId, user);

    const updated = await this.prisma.church.update({
      where: { id: churchId },
      data: { status: dto.status },
      select: {
        id: true,
        church_name: true,
        status: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      message: 'Church status updated successfully',
      data: updated,
    };
  }

  async softDelete(id: string, user: any) {
    // Resolve the actual church ID based on user role
    const churchId = await this.resolveChurchId(id, user);

    // Verify church exists
    await this.findOne(churchId, user);

    const deleted = await this.prisma.church.update({
      where: { id: churchId },
      data: { deleted_at: new Date() },
      select: {
        id: true,
        church_name: true,
        deleted_at: true,
      },
    });

    return {
      success: true,
      message: 'Church deleted successfully',
      data: deleted,
    };
  }
}
