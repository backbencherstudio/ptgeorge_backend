import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryChurchDto } from './dto/query-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { UpdateChurchStatusDto } from './dto/update-church-status.dto';
import { Prisma } from 'prisma/generated/client';

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

    // Define all available fields with their types
    const allFields = {
      id: true,
      church_name: true,
      church_city: true,
      church_email: true,
      church_domain: true,
      church_adminname: true,
      church_members: true,
      status: true,
      auth_type: true,
      created_at: true,
      updated_at: true,
    } as const;

    // Parse fields string to array if provided
    let select: Record<string, boolean>;

    if (fieldsString && fieldsString.trim()) {
      // Split the comma-separated string and trim whitespace
      const requestedFields = fieldsString
        .split(',')
        .map((field) => field.trim());

      // Build select object with requested fields
      select = {};
      requestedFields.forEach((field) => {
        if (field in allFields) {
          select[field] = true;
        }
      });

      // If no valid fields were requested, fall back to all fields
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

  async findOne(id: string) {
    const church = await this.prisma.church.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      select: {
        id: true,
        church_name: true,
        church_city: true,
        church_email: true,
        church_domain: true,
        church_adminname: true,
        church_members: true,
        status: true,
        auth_type: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!church) throw new NotFoundException('Church not found');
    return church;
  }

  async update(id: string, dto: UpdateChurchDto) {
    await this.findOne(id);

    const updated = await this.prisma.church.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        church_name: true,
        church_city: true,
        church_email: true,
        church_domain: true,
        church_adminname: true,
        church_members: true,
        status: true,
        auth_type: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      message: 'Church updated successfully',
      data: updated,
    };
  }

  async updateStatus(id: string, dto: UpdateChurchStatusDto) {
    await this.findOne(id);

    const updated = await this.prisma.church.update({
      where: { id },
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

  async softDelete(id: string) {
    await this.findOne(id);

    const deleted = await this.prisma.church.update({
      where: { id },
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
