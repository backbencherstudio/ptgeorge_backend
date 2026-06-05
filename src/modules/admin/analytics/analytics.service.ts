// analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SuperAdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(userId?: string) {
    const [
      totalUsers,
      activeUsers,
      totalChurches,
      totalMembersAcrossPlatform,
      membersPerChurchRaw,
      adPerformanceRaw,
      usersByRoleRaw,
      churchStatusRaw,
      adClickTotal,
      adViewTotal,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count({
        where: { deleted_at: null },
      }),

      // Active users
      this.prisma.user.count({
        where: { deleted_at: null, status: 'ACTIVE' },
      }),

      // Total churches
      this.prisma.church.count({
        where: { deleted_at: null },
      }),

      // Total members across platform
      this.prisma.churchMember.count({
        where: {
          status: 'ACTIVE',
          deleted_at: null,
          church: { deleted_at: null },
        },
      }),

      // Members per church (optimized with groupBy)
      this.prisma.churchMember.groupBy({
        by: ['church_id'],
        where: {
          status: 'ACTIVE',
          deleted_at: null,
          church: { deleted_at: null },
        },
        _count: { church_id: true },
        orderBy: { _count: { church_id: 'desc' } },
      }),

      // Ad performance (top 5 by views)
      this.prisma.ad.findMany({
        where: { deleted_at: null },
        select: {
          title: true,
          total_views: true,
          total_clicks: true,
        },
        orderBy: { total_views: 'desc' },
        take: 5,
      }),

      // Users by role (optimized with groupBy)
      this.prisma.user.groupBy({
        by: ['type'],
        where: {
          deleted_at: null,
          status: 'ACTIVE',
        },
        _count: { type: true },
      }),

      // Church status breakdown (optimized with groupBy)
      this.prisma.church.groupBy({
        by: ['status'],
        where: { deleted_at: null },
        _count: { status: true },
      }),

      // Total ad clicks
      this.prisma.ad.aggregate({
        _sum: { total_clicks: true },
        where: { deleted_at: null },
      }),

      // Total ad views
      this.prisma.ad.aggregate({
        _sum: { total_views: true },
        where: { deleted_at: null },
      }),
    ]);

    // Get church names for members per church (single query with join)
    const churchIds = membersPerChurchRaw.map((item) => item.church_id);
    const churches =
      churchIds.length > 0
        ? await this.prisma.church.findMany({
            where: { id: { in: churchIds }, deleted_at: null },
            select: { id: true, church_name: true },
          })
        : [];

    const churchMap = new Map(churches.map((c) => [c.id, c.church_name]));

    // Format members per church
    const membersPerChurch = membersPerChurchRaw
      .map((item) => ({
        churchName: churchMap.get(item.church_id) || 'Unknown Church',
        memberCount: item._count.church_id,
      }))
      .filter((item) => item.memberCount > 0);

    // Format ad performance
    const totalAdViews = adViewTotal._sum.total_views || 0;
    const totalAdClicks = adClickTotal._sum.total_clicks || 0;
    const adCtr = totalAdViews > 0 ? (totalAdClicks / totalAdViews) * 100 : 0;

    const adPerformance = adPerformanceRaw.map((ad) => ({
      title:
        ad.title.length > 30 ? ad.title.substring(0, 30) + '...' : ad.title,
      views: ad.total_views,
      clicks: ad.total_clicks,
    }));

    // Format users by role
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: 'System Admin',
      ADMIN: 'Admin',
      CHURCH_ADMIN: 'Church Main Admin',
      USER: 'Member',
      PRO_USER: 'Pro User',
    };

    const usersByRole = usersByRoleRaw
      .map((item) => ({
        role: roleMap[item.type] || item.type,
        count: item._count.type,
      }))
      .sort((a, b) => b.count - a.count);

    // Format church status breakdown
    const totalChurchCount = churchStatusRaw.reduce(
      (sum, item) => sum + item._count.status,
      0,
    );

    const statusMap: Record<string, string> = {
      ACTIVE: 'Active',
      PENDING: 'Pending',
      INACTIVE: 'Inactive',
      SUSPENDED: 'Suspended',
    };

    const churchStatusBreakdown = churchStatusRaw.map((item) => ({
      status: statusMap[item.status] || item.status,
      count: item._count.status,
      percentage: parseFloat(
        ((item._count.status / totalChurchCount) * 100).toFixed(1),
      ),
    }));

    // Return complete response
    return {
      totals: {
        totalUsers,
        activeUsers,
        totalChurches,
      },
      totalMembersAcrossPlatform,
      adCtr: parseFloat(adCtr.toFixed(2)),
      totalAdClicks,
      membersPerChurch,
      adPerformance,
      usersByRole,
      churchStatusBreakdown,
    };
  }
}
