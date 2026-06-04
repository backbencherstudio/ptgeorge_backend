import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreateAuditLogDto {
  actor: string;
  action: string;
  target: string;
  church?: string;
  actor_id?: string;
  actor_type?: string;
  church_id?: string;
}

export interface GetAuditLogsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  actor?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  church_id?: string;
  userId?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async createLog(data: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actor: data.actor,
          action: data.action,
          target: data.target,
          church: data.church || '--',
          actor_id: data.actor_id,
          actor_type: data.actor_type,
          church_id: data.church_id,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        churchUser: true,
        church_memberships: true,
      },
    });
  }

  /**
   * Get audit logs with proper role-based filtering
   */
  async getAuditLogs(query: GetAuditLogsQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      actor,
      action,
      startDate,
      endDate,
      church_id,
      userId,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (userId) {
      const user = await this.getUserById(userId);

      if (user?.type === 'CHURCH_ADMIN') {
        // churchUser is empty because the seed links admin via ChurchMember,
        // not via Church.user_id — so we use church_memberships instead
        const membership = user.church_memberships?.[0];

        if (membership?.church_id) {
          where.church_id = membership.church_id;
        } else {
          // Fallback: query memberships directly if not included in getUserById
          const member = await this.prisma.churchMember.findFirst({
            where: {
              user_id: userId,
              status: 'ACTIVE',
              deleted_at: null,
            },
            select: { church_id: true },
          });

          if (member?.church_id) {
            where.church_id = member.church_id;
          } else {
            return {
              data: [],
              meta: { total: 0, page, limit, totalPages: 0 },
            };
          }
        }
      }
      // SUPER_ADMIN falls through with no church_id filter → sees all logs
    } else if (church_id) {
      where.church_id = church_id;
    }

    if (actor) {
      where.actor = { contains: actor, mode: 'insensitive' };
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    if (search) {
      where.OR = [
        { actor: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
        { church: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
