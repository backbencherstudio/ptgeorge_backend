import { Module } from '@nestjs/common';
import { ChurchAdminModule } from './church-role-assignment/church-admin.module';
import { ChurchMembersModule } from './members-directory/members-directory.module';
import { ProUserModule } from './member-request/memeber-request.module';
import { ChurchAdminAnalyticsModule } from './overview/overview.module';

@Module({
  imports: [
    ChurchAdminAnalyticsModule,
    ChurchAdminModule,
    ChurchMembersModule,
    ProUserModule,
  ],
})
export class ChurchAdminApplicationModule {}
