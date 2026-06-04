import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { CommunityModule } from './community/community.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    NotificationModule,
    CommunityModule,
    ProfileModule,
  ],
})
export class ApplicationModule {}
