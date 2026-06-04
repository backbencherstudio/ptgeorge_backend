import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { CommunityModule } from './community/community.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    NotificationModule,
    CommunityModule,
    AuditLogModule,
    ProfileModule,
  ],
})
export class ApplicationModule {}
