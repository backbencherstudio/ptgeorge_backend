import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admins.controller';
import { SystemAdminService } from './system-admins.service';

@Module({
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
})
export class SystemAdminModule {}
