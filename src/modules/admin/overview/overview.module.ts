import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SuperAdminController } from './overview.controller';
import { SuperAdminService } from './overview.service';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminOverviewModule {}
