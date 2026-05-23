import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { CommunityModule } from './community/community.module';

@Module({
  imports: [
    NotificationModule,
    CommunityModule,
  ],
})
export class ApplicationModule {}
