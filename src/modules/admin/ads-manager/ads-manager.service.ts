import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/ad-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import { ConfigService } from '@nestjs/config';
import { AdPlacement, AdStatus, Prisma } from 'prisma/generated/browser';
import { AuditLogService } from 'src/modules/application/audit-log/audit-log.service';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);
  private readonly appUrl: string;
  private readonly storageBasePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.appUrl =
      this.configService.get<string>('app.url') || 'http://localhost:3000';
    this.storageBasePath =
      this.configService.get<string>('storageUrl.rootUrlPublic') ||
      '/public/storage';
  }

  private getFullUrl(relativePath: string): string {
    if (!relativePath) return '';
    const cleanPath = relativePath.replace(/^\//, '');
    return `${this.appUrl}${this.storageBasePath}/${cleanPath}`;
  }

  private formatLocationDisplay(country?: string, city?: string): string {
    if (!country && !city) return 'All Locations';
    if (country && city) return `${city}, ${country}`;
    if (country) return country;
    return city || 'All Locations';
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
    createAdDto: CreateAdDto,
    userId: string,
    thumbnailFile?: Express.Multer.File,
  ) {
    try {
      const { start_date, end_date, country, city, ...data } = createAdDto;

      if (!userId) {
        return {
          success: false,
          statusCode: 400,
          message: 'User ID is required',
        };
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userExists) {
        return {
          success: false,
          statusCode: 404,
          message: `User with ID ${userId} does not exist`,
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

      if (startDate < new Date()) {
        return {
          success: false,
          statusCode: 400,
          message: 'Start date cannot be in the past',
        };
      }

      let thumbnailPath = '';
      if (thumbnailFile) {
        const fileName = `ads/${Date.now()}-${thumbnailFile.originalname}`;
        await TanvirStorage.put(fileName, thumbnailFile.buffer);
        thumbnailPath = fileName;
      }

      const ad = await this.prisma.ad.create({
        data: {
          title: data.title,
          description: data.description,
          link: data.link,
          status: data.status || 'ACTIVE',
          placement: data.placement || 'HOME_BANNER',
          start_date: startDate,
          end_date: endDate,
          country: country || null,
          city: city || null,
          thumbnail: thumbnailPath,
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

      this.logger.log(`Ad created: ${ad.id} by user ${userId}`);

      // Create audit log
      await this.createAuditLog(
        userId,
        'CREATED_AD',
        `${ad.title} - ${ad.placement} (${this.formatLocationDisplay(ad.country, ad.city)})`,
        null,
        '--',
      );

      return {
        success: true,
        statusCode: 201,
        message: 'Ad created successfully',
        data: {
          id: ad.id,
          title: ad.title,
          description: ad.description,
          link: ad.link,
          thumbnail_url: this.getFullUrl(ad.thumbnail),
          status: ad.status,
          placement: ad.placement,
          country: ad.country,
          city: ad.city,
          location_display: this.formatLocationDisplay(ad.country, ad.city),
          start_date: ad.start_date,
          end_date: ad.end_date,
          total_views: ad.total_views,
          total_clicks: ad.total_clicks,
          created_at: ad.created_at,
          created_by: ad.created_by,
          metrics: {
            views: ad.total_views,
            clicks: ad.total_clicks,
            ctr: 0,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error creating ad: ${error.message}`);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to create ad',
        error: error.message,
      };
    }
  }

  async findAll(query: AdQueryDto, userId?: string, isAdmin: boolean = false) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        start_date_from,
        start_date_to,
        ...filters
      } = query;
      const skip = (page - 1) * limit;

      const where: Prisma.AdWhereInput = {};

      if (filters.status) where.status = filters.status;
      if (filters.placement) where.placement = filters.placement;
      if (filters.country) where.country = filters.country;

      if (!isAdmin && userId) {
        where.created_by_id = userId;
      } else if (filters.created_by_id) {
        where.created_by_id = filters.created_by_id;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (start_date_from || start_date_to) {
        where.start_date = {};
        if (start_date_from) where.start_date.gte = new Date(start_date_from);
        if (start_date_to) where.start_date.lte = new Date(start_date_to);
      }

      where.deleted_at = null;

      const [ads, total] = await Promise.all([
        this.prisma.ad.findMany({
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
        this.prisma.ad.count({ where }),
      ]);

      const data = ads.map((ad) => ({
        id: ad.id,
        title: ad.title,
        description: ad.description,
        link: ad.link,
        thumbnail_url: this.getFullUrl(ad.thumbnail),
        status: ad.status,
        placement: ad.placement,
        country: ad.country,
        city: ad.city,
        location_display: this.formatLocationDisplay(ad.country, ad.city),
        start_date: ad.start_date,
        end_date: ad.end_date,
        total_views: ad.total_views,
        total_clicks: ad.total_clicks,
        created_at: ad.created_at,
        created_by: ad.created_by,
        metrics: {
          views: ad.total_views,
          clicks: ad.total_clicks,
          ctr:
            ad.total_views > 0
              ? Number(((ad.total_clicks / ad.total_views) * 100).toFixed(2))
              : 0,
        },
      }));

      return {
        success: true,
        statusCode: 200,
        message: 'Ads retrieved successfully',
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
        message: 'Failed to retrieve ads',
        error: error.message,
      };
    }
  }

  async findPublicAds(cursorPaginationDto: CursorPaginationDto) {
    try {
      const {
        limit = 10,
        cursor,
        order = 'desc',
        placement,
        country,
        city,
      } = cursorPaginationDto;

      // Validate and sanitize limit
      const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 50);

      // Validate and set sort order
      const sortOrder: Prisma.SortOrder = order === 'asc' ? 'asc' : 'desc';

      // Build base where clause
      const where: Prisma.AdWhereInput = {
        deleted_at: null,
        status: AdStatus.ACTIVE,
        ...(placement && { placement: placement as AdPlacement }),
        ...(country && { country }),
        ...(city && { city }),
      };

      // Build cursor condition
      let cursorCondition: Prisma.AdWhereInput = {};

      if (cursor) {
        const cursorAd = await this.prisma.ad.findUnique({
          where: { id: cursor },
          select: {
            id: true,
            created_at: true,
          },
        });

        if (!cursorAd) {
          return {
            success: false,
            statusCode: 400,
            message: 'Invalid cursor: Ad not found',
          };
        }

        // Build cursor-based pagination condition
        if (sortOrder === 'desc') {
          cursorCondition = {
            OR: [
              {
                created_at: {
                  lt: cursorAd.created_at,
                },
              },
              {
                AND: [
                  {
                    created_at: cursorAd.created_at,
                  },
                  {
                    id: {
                      lt: cursorAd.id,
                    },
                  },
                ],
              },
            ],
          };
        } else {
          cursorCondition = {
            OR: [
              {
                created_at: {
                  gt: cursorAd.created_at,
                },
              },
              {
                AND: [
                  {
                    created_at: cursorAd.created_at,
                  },
                  {
                    id: {
                      gt: cursorAd.id,
                    },
                  },
                ],
              },
            ],
          };
        }
      }

      // Combine where clauses
      const finalWhere = cursor
        ? {
            AND: [where, cursorCondition],
          }
        : where;

      // Log query for debugging
      this.logger.debug(`Fetching ads with query:`, {
        where: finalWhere,
        orderBy: [{ created_at: sortOrder }, { id: sortOrder }],
        take: pageSize + 1,
      });

      // Execute query — fetch page items + total matching count in parallel
      const [ads, totalMatching] = await Promise.all([
        this.prisma.ad.findMany({
          where: finalWhere,
          orderBy: [
            {
              created_at: sortOrder,
            },
            {
              id: sortOrder,
            },
          ],
          take: pageSize + 1,
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
        }),

        // total count matching the BASE filters (status/placement/country/city),
        // ignoring the cursor — this tells you how many ads exist across ALL pages
        this.prisma.ad.count({ where }),
      ]);

      // Log results
      this.logger.debug(
        `Found ${ads.length} ads (including extra for hasMore check). Total matching base filters: ${totalMatching}`,
      );

      // Determine if there are more items
      const hasMore = ads.length > pageSize;

      // Slice to the actual page size
      const items = hasMore ? ads.slice(0, pageSize) : ads;

      this.logger.debug(`Returning ${items.length} ads, hasMore: ${hasMore}`);

      // Format response
      const formattedAds = items.map((ad) => ({
        id: ad.id,
        title: ad.title,
        description: ad.description,
        link: ad.link,
        thumbnail_url: this.getFullUrl(ad.thumbnail),
        status: ad.status,
        placement: ad.placement,
        country: ad.country,
        city: ad.city,
        location_display: this.formatLocationDisplay(ad.country, ad.city),
        start_date: ad.start_date,
        end_date: ad.end_date,
        total_views: ad.total_views,
        total_clicks: ad.total_clicks,
        created_at: ad.created_at,
        created_by: ad.created_by,
        metrics: {
          views: ad.total_views,
          clicks: ad.total_clicks,
          ctr:
            ad.total_views > 0
              ? Number(((ad.total_clicks / ad.total_views) * 100).toFixed(2))
              : 0,
        },
      }));

      // Determine next cursor
      const nextCursor =
        hasMore && items.length > 0 ? items[items.length - 1].id : null;

      return {
        success: true,
        statusCode: 200,
        message: 'Ads retrieved successfully',
        data: {
          items: formattedAds,
          meta: {
            limit: pageSize,
            next_cursor: nextCursor,
            has_more: hasMore,
            total_returned: items.length,
            total_matching: totalMatching,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching public ads: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve ads',
        error: error.message,
      };
    }
  }

  async findOne(id: string, userId?: string, isAdmin: boolean = false) {
    try {
      const ad = await this.prisma.ad.findFirst({
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
          ad_views: {
            take: 10,
            orderBy: { created_at: 'desc' },
            select: {
              created_at: true,
              ip_address: true,
            },
          },
          ad_clicks: {
            take: 10,
            orderBy: { created_at: 'desc' },
            select: {
              created_at: true,
              ip_address: true,
            },
          },
        },
      });

      if (!ad) {
        return {
          success: false,
          statusCode: 404,
          message: `Ad with ID ${id} not found`,
        };
      }

      if (!isAdmin && userId && ad.created_by_id !== userId) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to view this ad',
        };
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Ad retrieved successfully',
        data: {
          id: ad.id,
          title: ad.title,
          description: ad.description,
          link: ad.link,
          thumbnail_url: this.getFullUrl(ad.thumbnail),
          status: ad.status,
          placement: ad.placement,
          country: ad.country,
          city: ad.city,
          location_display: this.formatLocationDisplay(ad.country, ad.city),
          start_date: ad.start_date,
          end_date: ad.end_date,
          total_views: ad.total_views,
          total_clicks: ad.total_clicks,
          created_at: ad.created_at,
          created_by: ad.created_by,
          recent_views: ad.ad_views,
          recent_clicks: ad.ad_clicks,
          metrics: {
            views: ad.total_views,
            clicks: ad.total_clicks,
            ctr:
              ad.total_views > 0
                ? Number(((ad.total_clicks / ad.total_views) * 100).toFixed(2))
                : 0,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve ad',
        error: error.message,
      };
    }
  }

  async update(
    id: string,
    updateAdDto: UpdateAdDto,
    userId: string,
    isAdmin: boolean = false,
    thumbnailFile?: Express.Multer.File,
  ) {
    try {
      const ad = await this.prisma.ad.findFirst({
        where: { id, deleted_at: null },
      });

      if (!ad) {
        return {
          success: false,
          statusCode: 404,
          message: `Ad with ID ${id} not found`,
        };
      }

      if (!isAdmin && ad.created_by_id !== userId) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to update this ad',
        };
      }

      const { start_date, end_date, country, city, ...data } = updateAdDto;
      const updateData: Prisma.AdUpdateInput = { ...data };

      if (country !== undefined) updateData.country = country || null;
      if (city !== undefined) updateData.city = city || null;

      if (thumbnailFile) {
        if (ad.thumbnail) {
          await TanvirStorage.delete(ad.thumbnail).catch((err) =>
            this.logger.warn(`Failed to delete old thumbnail: ${err.message}`),
          );
        }

        const fileName = `ads/${Date.now()}-${thumbnailFile.originalname}`;
        await TanvirStorage.put(fileName, thumbnailFile.buffer);
        updateData.thumbnail = fileName;
      }

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
        updateData.start_date = start;
        updateData.end_date = end;
      } else if (start_date) {
        updateData.start_date = new Date(start_date);
      } else if (end_date) {
        updateData.end_date = new Date(end_date);
      }

      const updatedAd = await this.prisma.ad.update({
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

      this.logger.log(`Ad updated: ${id} by user ${userId}`);

      // Create audit log
      const changes = [];
      if (updateAdDto.title && updateAdDto.title !== ad.title)
        changes.push(`title: ${ad.title} → ${updateAdDto.title}`);
      if (updateAdDto.status && updateAdDto.status !== ad.status)
        changes.push(`status: ${ad.status} → ${updateAdDto.status}`);
      if (updateAdDto.placement && updateAdDto.placement !== ad.placement)
        changes.push(`placement: ${ad.placement} → ${updateAdDto.placement}`);
      if (
        updateAdDto.country !== undefined &&
        updateAdDto.country !== ad.country
      )
        changes.push(
          `country: ${ad.country || 'none'} → ${updateAdDto.country || 'none'}`,
        );
      if (updateAdDto.city !== undefined && updateAdDto.city !== ad.city)
        changes.push(
          `city: ${ad.city || 'none'} → ${updateAdDto.city || 'none'}`,
        );

      const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
      await this.createAuditLog(
        userId,
        'UPDATED_AD',
        `${ad.title} → ${updatedAd.title}${changeText}`,
        null,
        '--',
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Ad updated successfully',
        data: {
          id: updatedAd.id,
          title: updatedAd.title,
          description: updatedAd.description,
          link: updatedAd.link,
          thumbnail_url: this.getFullUrl(updatedAd.thumbnail),
          status: updatedAd.status,
          placement: updatedAd.placement,
          country: updatedAd.country,
          city: updatedAd.city,
          location_display: this.formatLocationDisplay(
            updatedAd.country,
            updatedAd.city,
          ),
          start_date: updatedAd.start_date,
          end_date: updatedAd.end_date,
          total_views: updatedAd.total_views,
          total_clicks: updatedAd.total_clicks,
          created_at: updatedAd.created_at,
          created_by: updatedAd.created_by,
          metrics: {
            views: updatedAd.total_views,
            clicks: updatedAd.total_clicks,
            ctr:
              updatedAd.total_views > 0
                ? Number(
                    (
                      (updatedAd.total_clicks / updatedAd.total_views) *
                      100
                    ).toFixed(2),
                  )
                : 0,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to update ad',
        error: error.message,
      };
    }
  }

  async remove(id: string, userId: string, isAdmin: boolean = false) {
    try {
      const ad = await this.prisma.ad.findFirst({
        where: { id, deleted_at: null },
      });

      if (!ad) {
        return {
          success: false,
          statusCode: 404,
          message: `Ad with ID ${id} not found`,
        };
      }

      if (!isAdmin && ad.created_by_id !== userId) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to delete this ad',
        };
      }

      if (ad.thumbnail) {
        await TanvirStorage.delete(ad.thumbnail).catch((err) =>
          this.logger.warn(`Failed to delete thumbnail: ${err.message}`),
        );
      }

      await this.prisma.ad.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      this.logger.log(`Ad deleted: ${id} by user ${userId}`);

      // Create audit log
      await this.createAuditLog(
        userId,
        'DELETED_AD',
        `${ad.title} (${ad.placement}) - ${this.formatLocationDisplay(ad.country, ad.city)}`,
        null,
        '--',
      );

      return {
        success: true,
        statusCode: 200,
        message: 'Ad deleted successfully',
        data: { ad_id: id },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to delete ad',
        error: error.message,
      };
    }
  }

  async bulkUpdateStatus(
    ids: string[],
    status: AdStatus,
    userId: string,
    isAdmin: boolean = false,
  ) {
    try {
      const ads = await this.prisma.ad.findMany({
        where: {
          id: { in: ids },
          deleted_at: null,
        },
      });

      const accessibleIds = isAdmin
        ? ids
        : ads.filter((ad) => ad.created_by_id === userId).map((ad) => ad.id);

      if (accessibleIds.length === 0) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to update any of these ads',
        };
      }

      const result = await this.prisma.ad.updateMany({
        where: {
          id: { in: accessibleIds },
        },
        data: { status },
      });

      this.logger.log(
        `Bulk status update: ${result.count} ads set to ${status}`,
      );

      // Create audit log
      const affectedAds = ads.filter((ad) => accessibleIds.includes(ad.id));
      const adTitles = affectedAds.map((ad) => ad.title).join(', ');
      await this.createAuditLog(
        userId,
        'BULK_UPDATED_AD_STATUS',
        `${result.count} ad(s) status changed to ${status}: ${adTitles.substring(0, 200)}`,
        null,
        '--',
      );

      return {
        success: true,
        statusCode: 200,
        message: `${result.count} ads updated successfully`,
        data: {
          updated_count: result.count,
          failed_ids: ids.filter((id) => !accessibleIds.includes(id)),
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to update ad statuses',
        error: error.message,
      };
    }
  }

  async getAdAnalytics(
    adId: string,
    userId?: string,
    isAdmin: boolean = false,
  ) {
    try {
      const ad = await this.prisma.ad.findFirst({
        where: { id: adId, deleted_at: null },
      });

      if (!ad) {
        return {
          success: false,
          statusCode: 404,
          message: `Ad with ID ${adId} not found`,
        };
      }

      if (!isAdmin && userId && ad.created_by_id !== userId) {
        return {
          success: false,
          statusCode: 403,
          message: 'You do not have permission to view analytics for this ad',
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const [
        viewsToday,
        clicksToday,
        viewsThisWeek,
        clicksThisWeek,
        viewsThisMonth,
        clicksThisMonth,
        dailyMetrics,
      ] = await Promise.all([
        this.prisma.adView.count({
          where: { ad_id: adId, created_at: { gte: today } },
        }),
        this.prisma.adClick.count({
          where: { ad_id: adId, created_at: { gte: today } },
        }),
        this.prisma.adView.count({
          where: { ad_id: adId, created_at: { gte: weekAgo } },
        }),
        this.prisma.adClick.count({
          where: { ad_id: adId, created_at: { gte: weekAgo } },
        }),
        this.prisma.adView.count({
          where: { ad_id: adId, created_at: { gte: monthAgo } },
        }),
        this.prisma.adClick.count({
          where: { ad_id: adId, created_at: { gte: monthAgo } },
        }),
        this.prisma.adMetrics.findMany({
          where: { ad_id: adId },
          orderBy: { date: 'desc' },
          take: 30,
        }),
      ]);

      const ctr =
        ad.total_views > 0 ? (ad.total_clicks / ad.total_views) * 100 : 0;

      return {
        success: true,
        statusCode: 200,
        message: 'Analytics retrieved successfully',
        data: {
          ad_id: ad.id,
          ad_title: ad.title,
          total_views: ad.total_views,
          total_clicks: ad.total_clicks,
          ctr: Number(ctr.toFixed(2)),
          views_today: viewsToday,
          clicks_today: clicksToday,
          views_this_week: viewsThisWeek,
          clicks_this_week: clicksThisWeek,
          views_this_month: viewsThisMonth,
          clicks_this_month: clicksThisMonth,
          daily_metrics: dailyMetrics,
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve analytics',
        error: error.message,
      };
    }
  }

  async getDashboardAnalytics(userId: string, isAdmin: boolean = false) {
    try {
      const whereCondition: Prisma.AdWhereInput = isAdmin
        ? { deleted_at: null }
        : { created_by_id: userId, deleted_at: null };

      const ads = await this.prisma.ad.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          status: true,
          placement: true,
          country: true,
          city: true,
          total_views: true,
          total_clicks: true,
          created_at: true,
        },
      });

      const totalActive = ads.filter(
        (ad) => ad.status === AdStatus.ACTIVE,
      ).length;
      const totalPaused = ads.filter(
        (ad) => ad.status === AdStatus.PAUSED,
      ).length;
      const totalHidden = ads.filter(
        (ad) => ad.status === AdStatus.HIDDEN,
      ).length;
      const totalViews = ads.reduce((sum, ad) => sum + ad.total_views, 0);
      const totalClicks = ads.reduce((sum, ad) => sum + ad.total_clicks, 0);
      const averageCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      const topPerformingAds = ads
        .filter((ad) => ad.total_views >= 100)
        .map((ad) => ({
          ad_id: ad.id,
          ad_title: ad.title,
          location_display: this.formatLocationDisplay(ad.country, ad.city),
          total_views: ad.total_views,
          total_clicks: ad.total_clicks,
          created_at: ad.created_at,
          status: ad.status,
          placement: ad.placement,
          ctr:
            ad.total_views > 0
              ? Number(((ad.total_clicks / ad.total_views) * 100).toFixed(2))
              : 0,
        }))
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 6);

      return {
        success: true,
        statusCode: 200,
        message: 'Dashboard analytics retrieved successfully',
        data: {
          stats: {
            active: totalActive,
            paused: totalPaused,
            hidden: totalHidden,
            total_views: totalViews,
            total_clicks: totalClicks,
            average_ctr: Number(averageCtr.toFixed(2)),
          },
          top_performing_ads: topPerformingAds,
        },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve dashboard analytics',
        error: error.message,
      };
    }
  }

  async trackView(
    adId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const ad = await this.prisma.ad.findFirst({
        where: { id: adId, deleted_at: null, status: AdStatus.ACTIVE },
      });

      if (!ad) {
        return {
          success: false,
          statusCode: 404,
          message: 'Ad not found or inactive',
        };
      }

      await this.prisma.$transaction([
        this.prisma.adView.create({
          data: {
            ad_id: adId,
            user_id: userId,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        }),
        this.prisma.ad.update({
          where: { id: adId },
          data: { total_views: { increment: 1 } },
        }),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.$executeRaw`
        INSERT INTO "ad_metrics" (id, ad_id, date, views, clicks, updated_at)
        VALUES (gen_random_uuid(), ${adId}, ${today}, 1, 0, ${new Date()})
        ON CONFLICT (ad_id, date) 
        DO UPDATE SET views = "ad_metrics".views + 1, updated_at = ${new Date()}
      `;

      return {
        success: true,
        statusCode: 200,
        message: 'View tracked successfully',
        data: { ad_id: adId },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to track view',
        error: error.message,
      };
    }
  }

  async trackClick(
    adId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const ad = await this.prisma.ad.findFirst({
        where: { id: adId, deleted_at: null, status: AdStatus.ACTIVE },
      });

      if (!ad) {
        return {
          success: false,
          statusCode: 404,
          message: 'Ad not found or inactive',
        };
      }

      await this.prisma.$transaction([
        this.prisma.adClick.create({
          data: {
            ad_id: adId,
            user_id: userId,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        }),
        this.prisma.ad.update({
          where: { id: adId },
          data: { total_clicks: { increment: 1 } },
        }),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.$executeRaw`
        INSERT INTO "ad_metrics" (id, ad_id, date, views, clicks, updated_at)
        VALUES (gen_random_uuid(), ${adId}, ${today}, 0, 1, ${new Date()})
        ON CONFLICT (ad_id, date) 
        DO UPDATE SET clicks = "ad_metrics".clicks + 1, updated_at = ${new Date()}
      `;

      return {
        success: true,
        statusCode: 200,
        message: 'Click tracked successfully',
        data: { ad_id: adId, redirect_url: ad.link },
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to track click',
        error: error.message,
      };
    }
  }

  async getActiveAdsForPlacement(
    placement: string,
    location?: { country?: string; city?: string },
  ) {
    try {
      const now = new Date();

      const ads = await this.prisma.ad.findMany({
        where: {
          status: AdStatus.ACTIVE,
          placement: placement as any,
          deleted_at: null,
        },
        orderBy: [{ total_views: 'asc' }],
        take: 20,
      });

      let filteredAds = ads;
      if (location?.country && ads.length > 0) {
        filteredAds = filteredAds.filter((ad) => {
          if (!ad.country) return true;
          if (ad.country !== location.country) return false;
          if (ad.city && location.city && ad.city !== location.city)
            return false;
          return true;
        });
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Active ads retrieved successfully',
        data: filteredAds.map((ad) => ({
          id: ad.id,
          title: ad.title,
          description: ad.description,
          location_display: this.formatLocationDisplay(ad.country, ad.city),
          thumbnail_url: this.getFullUrl(ad.thumbnail),
          created_at: ad.created_at,
          status: ad.status,
          placement: ad.placement,
          link: ad.link,
        })),
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to retrieve active ads',
        error: error.message,
      };
    }
  }
}
