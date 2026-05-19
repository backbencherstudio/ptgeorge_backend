import { Module } from '@nestjs/common';
import { ChurchAdminModule } from './church-role-assignment/church-admin.module';
import { ChurchMembersModule } from './members-directory/members-directory.module';

@Module({
  imports: [ChurchAdminModule, ChurchMembersModule],
})
export class ChurchAdminApplicationModule {}
