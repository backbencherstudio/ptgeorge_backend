import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { CommunityModule } from './community/community.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [NotificationModule, CommunityModule, AuditLogModule],
})
export class ApplicationModule {}
