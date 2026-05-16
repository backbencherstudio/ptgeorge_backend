import { Module } from '@nestjs/common';
import { ChurchAdminModule } from './church-role-assignment/church-admin.module';

@Module({
  imports: [ChurchAdminModule],
})
export class ChurchAdminApplicationModule {}
