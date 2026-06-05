import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId?: string) {
    const [
      activeChurches,
      totalMembers,
      pendingVerifications,
      activeAds,
      adViewsStats,
      systemAdmins,
      recentActivities,
      pendingUsers,
    ] = await Promise.all([
      this.getActiveChurchesCount(),
      this.getTotalMembersCount(),
      this.getPendingVerificationsCount(),
      this.getActiveAdsCount(),
      this.getAdStats(),
      this.getSystemAdminsCount(),
      this.getRecentActivities(),
      this.getPendingUsers(),
    ]);

    return {
      stats: {
        activeChurches,
        totalMembers,
        pendingVerifications,
        activeAds,
        totalAdViews: adViewsStats.totalViews,
        totalAdClicks: adViewsStats.totalClicks,
        systemAdmins,
        totalAuditEvents: await this.getTotalAuditEventsCount(),
      },
      recentActivities,
      pendingUsers,
    };
  }

  // ─── STATS METHODS ─────────────────────────────────────────────────────────

  private async getActiveChurchesCount(): Promise<number> {
    const count = await this.prisma.church.count({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
      },
    });
    return count;
  }

  private async getTotalMembersCount(): Promise<number> {
    const count = await this.prisma.churchMember.count({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
        church: {
          deleted_at: null,
        },
      },
    });
    return count;
  }

  private async getPendingVerificationsCount(): Promise<number> {
    const count = await this.prisma.user.count({
      where: {
        status: 'PENDING',
        deleted_at: null,
      },
    });
    return count;
  }

  private async getActiveAdsCount(): Promise<number> {
    const now = new Date();
    const count = await this.prisma.ad.count({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
        start_date: { lte: now },
        end_date: { gte: now },
      },
    });
    return count;
  }

  private async getAdStats(): Promise<{
    totalViews: number;
    totalClicks: number;
  }> {
    const adTotals = await this.prisma.ad.aggregate({
      _sum: {
        total_views: true,
        total_clicks: true,
      },
      where: {
        deleted_at: null,
      },
    });

    return {
      totalViews: adTotals._sum.total_views || 0,
      totalClicks: adTotals._sum.total_clicks || 0,
    };
  }

  private async getSystemAdminsCount(): Promise<number> {
    const count = await this.prisma.user.count({
      where: {
        type: 'SUPER_ADMIN',
        deleted_at: null,
        status: 'ACTIVE',
      },
    });
    return count;
  }

  private async getTotalAuditEventsCount(): Promise<number> {
    const count = await this.prisma.auditLog.count();
    return count;
  }

  // ─── RECENT ACTIVITIES ─────────────────────────────────────────────────────

  private async getRecentActivities(limit: number = 5) {
    const activities = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        actor: true,
        action: true,
        target: true,
        church: true,
        created_at: true,
      },
    });

    return activities.map((activity) => ({
      actor: activity.actor,
      action: this.formatAction(activity.action),
      target: activity.target,
      church: activity.church || '--',
      createdAt: activity.created_at,
    }));
  }

  // ─── PENDING USERS ─────────────────────────────────────────────────────────

  private async getPendingUsers(limit: number = 5) {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'PENDING',
        deleted_at: null,
      },
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        church_name: true,
        created_at: true,
        type: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phoneNumber: user.phone_number,
      churchName: user.church_name,
      userType: user.type,
      requestedAt: user.created_at,
    }));
  }

  private formatAction(action: string): string {
    const actionMap: Record<string, string> = {
      CREATED_ROLE: 'Created Role',
      UPDATED_ROLE: 'Updated Role',
      DELETED_ROLE: 'Deleted Role',
      SUSPENDED_ROLE: 'Suspended Role',
      ACTIVATED_ROLE: 'Activated Role',
      ASSIGNED_PERMISSIONS_TO_ROLE: 'Assigned Permissions',
      ASSIGNED_ROLE: 'Assigned Role',
      REVOKED_ROLE: 'Revoked Role',
      CREATE: 'Created',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
      APPROVE: 'Approved',
      REJECT: 'Rejected',
      SUSPEND: 'Suspended',
      ACTIVATE: 'Activated',
    };

    return actionMap[action] || action.replace(/_/g, ' ');
  }
}
