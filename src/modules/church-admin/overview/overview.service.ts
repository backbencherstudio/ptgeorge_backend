import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChurchAdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(userId: string) {
    // First, get the church admin's church
    const churchAdmin = await this.prisma.church.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        church_name: true,
        church_city: true,
        church_email: true,
        church_domain: true,
        created_at: true,
      },
    });

    console.log(churchAdmin)
    
    if (!churchAdmin) {
      throw new NotFoundException(
        'No church found associated with this admin account.',
      );
    }

    const churchId = churchAdmin.id;

    // Run all queries in parallel for maximum performance
    const [
      totalMembers,
      activeHelpers,
      pendingRequests,
      activeLeaders,
      recentActivities,
      churchDetails,
    ] = await Promise.all([
      // Total active members in this church
      this.prisma.churchMember.count({
        where: {
          church_id: churchId,
          status: 'ACTIVE',
          deleted_at: null,
        },
      }),

      // Active helpers (members with HELPER role)
      this.prisma.churchMember.count({
        where: {
          church_id: churchId,
          status: 'ACTIVE',
          deleted_at: null,
          church_role: 'HELPER',
        },
      }),

      // Pending member requests
      this.prisma.churchMember.count({
        where: {
          church_id: churchId,
          status: 'PENDING',
          deleted_at: null,
        },
      }),

      // Active leaders (members with CHURCH_ADMIN or other leadership roles)
      this.prisma.churchMember.count({
        where: {
          church_id: churchId,
          status: 'ACTIVE',
          deleted_at: null,
          OR: [
            { church_role: 'CHURCH_ADMIN' },
            { church_role: 'EDITOR' },
            { church_role: 'LEADER' },
          ],
        },
      }),

      // Recent activities (audit logs for this church)
      this.prisma.auditLog.findMany({
        where: {
          OR: [{ church_id: churchId }, { church: churchAdmin.church_name }],
        },
        take: 5,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          actor: true,
          action: true,
          target: true,
          created_at: true,
        },
      }),

      // Get full church details for info section
      this.prisma.church.findUnique({
        where: { id: churchId },
        select: {
          church_name: true,
          church_city: true,
          church_email: true,
          created_at: true,
          user: {
            select: {
              address: true,
              phone_number: true,
              website: true,
            },
          },
        },
      }),
    ]);

    // Format church info
    const churchInfo = {
      churchName: churchDetails?.church_name || churchAdmin.church_name,
      location: churchDetails?.church_city || 'Location not set',
      established: churchDetails?.created_at
        ? `Est. ${churchDetails.created_at.getFullYear()}`
        : 'Est. --',
      address: churchDetails?.user?.address || 'Address not provided',
      email: churchDetails?.church_email || 'Email not provided',
      phone: churchDetails?.user?.phone_number || 'Phone not provided',
      website: churchDetails?.user?.website || 'Website not provided',
    };

    // Format stats
    const stats = {
      totalMembers,
      activeHelpers,
      pendingRequests,
      activeLeaders,
    };

    // Format recent activities
    const formattedActivities = recentActivities.map((activity) => ({
      actor: activity.actor,
      action: this.formatAction(activity.action),
      target: activity.target,
      createdAt: activity.created_at,
    }));

    return {
      churchInfo,
      stats,
      recentActivities: formattedActivities,
    };
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
      APPROVED_MEMBER: 'Approved Member',
      REJECT: 'Rejected',
      SUSPEND: 'Suspended',
      ACTIVATE: 'Activated',
      GRANTED_SUPERVISORY_RIGHTS: 'Granted Supervisory Rights',
    };

    return actionMap[action] || action.replace(/_/g, ' ');
  }
}
