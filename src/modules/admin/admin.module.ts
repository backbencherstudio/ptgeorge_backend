import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ChurchesModule } from './churches/churches.module';
import { AdsModule } from './ads-manager/ads-manager.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    UserModule,
    RolesModule,
    PermissionsModule,
    ChurchesModule,
    AdsModule,
    AnnouncementsModule,
    NotificationModule,
  ],
})
export class AdminModule {}
