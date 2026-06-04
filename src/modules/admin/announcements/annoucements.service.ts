import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import {
  AnnouncementAudience,
  AnnouncementStatus,
} from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/browser';
import { AuditLogService } from 'src/modules/application/audit-log/audit-log.service';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
        this.logger.log('No userId provided for audit log, skipping...');
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { churchUser: true },
      });

      if (!user) {
        this.logger.log(`User with id ${userId} not found for audit log`);
        return;
      }

      let actorName: string = user.type;
      if (user.first_name && user.last_name) {
        actorName = `${user.first_name} ${user.last_name}`;
      } else if (user.first_name) {
        actorName = user.first_name;
      }

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
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  async create(
    createDto: CreateAnnouncementDto,
    userId: string,
    userType: string,
    userChurchId?: string,
  ) {
    try {
      const { start_date, end_date, target_church_ids, ...data } = createDto;

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          message: 'User ID is required',
        };
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        return {
          success: false,
          statusCode: 400,
          message: 'End date must be after start date',
        };
      }

      let finalTargetChurchIds = [];

      // Role-based validation
      if (userType === 'CHURCH_ADMIN') {
        // Church admins can only create announcements for their own church
        if (!userChurchId) {
          return {
            success: false,
            statusCode: 403,
            message: 'Church admin must have a church associated',
          };
        }

        // Church admin announcements only go to their church
        finalTargetChurchIds = [userChurchId];

        // Log warning if they tried to target other churches
        if (target_church_ids && target_church_ids.length > 0) {
          this.logger.warn(
            `Church admin ${userId} attempted to target specific churches. Ignored and using their own church.`,
          );
        }
      } else {
        // Super Admin or other roles
        finalTargetChurchIds = target_church_ids || [];

        // Validate that all target churches exist for super admin
        if (userType === 'SUPER_ADMIN' && finalTargetChurchIds.length > 0) {
          const existingChurches = await this.prisma.church.findMany({
            where: { id: { in: finalTargetChurchIds } },
            select: { id: true },
          });

          if (existingChurches.length !== finalTargetChurchIds.length) {
            return {
              success: false,
              statusCode: 400,
              message: 'One or more target church IDs do not exist',
            };
          }
        }
      }

      const announcement = await this.prisma.announcement.create({
        data: {
          title: data.title,
          message: data.message,
          status: data.status || AnnouncementStatus.UNPUBLISHED,
          audience: data.audience || AnnouncementAudience.ALL_USERS,
          start_date: startDate,
          end_date: endDate,
          target_church_ids: finalTargetChurchIds,
          created_by_id: userId,
        },
        include: {
          created_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Announcement created: ${announcement.id} by user ${userId} (${userType})`,
      );

      const now = new Date();
      const isActive = announcement.status === AnnouncementStatus.PUBLISHED;

      // Create audit log
      const audienceText =
        announcement.audience === 'ALL_USERS'
          ? 'All Users'
          : announcement.audience === 'CHURCH_ADMINS_ONLY'
            ? 'Church Admins Only'
            : announcement.audience === 'SUPER_ADMINS_ONLY'
              ? 'Super Admins Only'
              : 'Specific Churches';
      const churchText =
        finalTargetChurchIds.length > 0
          ? ` for ${finalTargetChurchIds.length} church(es)`
          : '';
      await this.createAuditLog(
        userId,
        'CREATED_ANNOUNCEMENT',
        `${announcement.title} - ${audienceText}${churchText}`,
        userChurchId,
        null,
      );

      return {
        success: true,
        statusCode: 201,
        message: 'Announcement created successfully',
        data: {
          ...announcement,
          is_active: isActive,
        },
      };
    } catch (error) {
      this.logger.error(`Error creating announcement: ${error.message}`);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to create announcement',
        error: error.message,
      };
    }
  }

  async findAll(
    query: AnnouncementQueryDto,
    userId?: string,
    isAdmin: boolean = false,
    userChurchId?: string,
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        start_date_from,
        start_date_to,
        active_only,
        church_id,
        ...filters
      } = query;
      const skip = (page - 1) * limit;

      const where: Prisma.AnnouncementWhereInput = { deleted_at: null };

      if (filters.status) where.status = filters.status;
      if (filters.audience) where.audience = filters.audience;

      // Non-admin users can only see published announcements
      if (!isAdmin) {
        where.status = AnnouncementStatus.PUBLISHED;

        // Filter by church targeting for regular users
        if (userChurchId) {
          where.OR = [
            { target_church_ids: { equals: [] } }, // Empty array = all churches
            { target_church_ids: { has: userChurchId } }, // User's church is targeted
          ];
        }
      } else if (filters.created_by_id) {
        where.created_by_id = filters.created_by_id;
      }

      // Admin filter by specific church
      if (isAdmin && church_id) {
        where.target_church_ids = { has: church_id };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (start_date_from || start_date_to) {
        where.start_date = {};
        if (start_date_from) where.start_date.gte = new Date(start_date_from);
        if (start_date_to) where.start_date.lte = new Date(start_date_to);
      }

      // Only show active announcements
      if (active_only) {
        const now = new Date();
        where.status = AnnouncementStatus.PUBLISHED;
        // where.start_date = { lte: now };
        // where.end_date = { gte: now };
      }

      const [announcements, total] = await Promise.all([
        this.prisma.announcement.findMany({
          where,
          include: {
            created_by: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.announcement.count({ where }),
      ]);

      const now = new Date();
      const data = announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        status: announcement.status,
        audience: announcement.audience,
        target_church_ids: announcement.target_church_ids,
        start_date: announcement.start_date,
        end_date: announcement.end_date,
        created_at: announcement.created_at,
        updated_at: announcement.updated_at,
        created_by: announcement.created_by,
        is_active: announcement.status === AnnouncementStatus.PUBLISHED,
      }));

      return {
        success: true,
        statusCode: 200,
        message: 'Announcements retrieved successfully',
        data: {
          items: data,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve announcements',
        error: error.message,
      };
    }
  }

  async findOne(
    id: string,
    userId?: string,
    isAdmin: boolean = false,
    userChurchId?: string,
  ) {
    try {
      const announcement = await this.prisma.announcement.findFirst({
        where: {
          id,
          deleted_at: null,
        },
        include: {
          created_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      if (!announcement) {
        return {
          success: false,
          statusCode: 404,
          message: `Announcement with ID ${id} not found`,
        };
      }

      // Check if user has permission to view
      if (!isAdmin) {
        if (announcement.status !== AnnouncementStatus.PUBLISHED) {
          return {
            success: false,
            statusCode: 403,
            message: 'This announcement is not published',
          };
        }

        // Check if user's church is targeted
        const targetChurchIds = announcement.target_church_ids as string[];
        if (targetChurchIds && targetChurchIds.length > 0 && userChurchId) {
          if (!targetChurchIds.includes(userChurchId)) {
            return {
              success: false,
              statusCode: 403,
              message: 'You do not have permission to view this announcement',
            };
          }
        }
      }

      const now = new Date();
      const isActive = announcement.status === AnnouncementStatus.PUBLISHED;

      return {
        success: true,
        statusCode: 200,
        message: 'Announcement retrieved successfully',
        data: {
          ...announcement,
          is_active: isActive,
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve announcement',
        error: error.message,
      };
    }
  }

  async update(
    id: string,
    updateDto: UpdateAnnouncementDto,
    userId: string,
    isAdmin: boolean = false,
  ) {
    try {
      const announcement = await this.prisma.announcement.findFirst({
        where: { id, deleted_at: null },
      });

      if (!announcement) {
        return {
          success: false,
          statusCode: 404,
          message: `Announcement with ID ${id} not found`,
        };
      }

      if (!isAdmin && announcement.created_by_id !== userId) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to update this announcement',
        };
      }

      const { start_date, end_date, target_church_ids, ...data } = updateDto;
      const updateData: Prisma.AnnouncementUpdateInput = { ...data };

      if (start_date) updateData.start_date = new Date(start_date);
      if (end_date) updateData.end_date = new Date(end_date);
      if (target_church_ids !== undefined)
        updateData.target_church_ids = target_church_ids;

      if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (start >= end) {
          return {
            success: false,
            statusCode: 400,
            message: 'End date must be after start date',
          };
        }
      }

      const updated = await this.prisma.announcement.update({
        where: { id },
        data: updateData,
        include: {
          created_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Announcement updated: ${id} by user ${userId}`);

      const now = new Date();
      const isActive = updated.status === AnnouncementStatus.PUBLISHED;

      // Create audit log
      const changes = [];
      if (updateDto.title && updateDto.title !== announcement.title)
        changes.push(`title: ${announcement.title} → ${updateDto.title}`);
      if (updateDto.status && updateDto.status !== announcement.status)
        changes.push(`status: ${announcement.status} → ${updateDto.status}`);
      if (updateDto.audience && updateDto.audience !== announcement.audience)
        changes.push(
          `audience: ${announcement.audience} → ${updateDto.audience}`,
        );
      if (updateDto.message && updateDto.message !== announcement.message)
        changes.push(`message updated`);

      const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
      await this.createAuditLog(
        userId,
        'UPDATED_ANNOUNCEMENT',
        `${announcement.title} → ${updated.title}${changeText}`,
        null,
        null,
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Announcement updated successfully',
        data: {
          ...updated,
          is_active: isActive,
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to update announcement',
        error: error.message,
      };
    }
  }

  async publish(id: string, userId: string, isAdmin: boolean = false) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deleted_at: null },
      select: { title: true, status: true },
    });

    const result = await this.update(
      id,
      { status: AnnouncementStatus.PUBLISHED },
      userId,
      isAdmin,
    );

    if (result.success && announcement) {
      await this.createAuditLog(
        userId,
        'PUBLISHED_ANNOUNCEMENT',
        `${announcement.title} was published`,
        null,
        null,
      );
    }

    return result;
  }

  async unpublish(id: string, userId: string, isAdmin: boolean = false) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deleted_at: null },
      select: { title: true, status: true },
    });

    const result = await this.update(
      id,
      { status: AnnouncementStatus.UNPUBLISHED },
      userId,
      isAdmin,
    );

    if (result.success && announcement) {
      await this.createAuditLog(
        userId,
        'UNPUBLISHED_ANNOUNCEMENT',
        `${announcement.title} was unpublished`,
        null,
        null,
      );
    }

    return result;
  }

  async remove(id: string, userId: string, isAdmin: boolean = false) {
    try {
      const announcement = await this.prisma.announcement.findFirst({
        where: { id, deleted_at: null },
        select: { title: true, audience: true, created_by_id: true },
      });

      if (!announcement) {
        return {
          success: false,
          statusCode: 404,
          message: `Announcement with ID ${id} not found`,
        };
      }

      if (!isAdmin && announcement.created_by_id !== userId) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to delete this announcement',
        };
      }

      await this.prisma.announcement.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      this.logger.log(`Announcement deleted: ${id} by user ${userId}`);

      // Create audit log
      await this.createAuditLog(
        userId,
        'DELETED_ANNOUNCEMENT',
        `${announcement.title} (${announcement.audience})`,
        null,
        null,
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Announcement deleted successfully',
        data: { announcement_id: id },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to delete announcement',
        error: error.message,
      };
    }
  }
}
