import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ChurchesModule } from './churches/churches.module';
import { AdsModule } from './ads-manager/ads-manager.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { SuperAdminOverviewModule } from './overview/overview.module';
import { SuperAdminAnalyticsModule } from './analytics/analytics.module';
import { SystemAdminModule } from './system-admins/system-admins.module';

@Module({
  imports: [
    SuperAdminOverviewModule,
    SuperAdminAnalyticsModule,
    UserModule,
    RolesModule,
    PermissionsModule,
    ChurchesModule,
    AdsModule,
    SystemAdminModule,
    AnnouncementsModule,
    NotificationModule,
  ],
})
export class AdminModule {}
