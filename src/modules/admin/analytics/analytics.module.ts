import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SuperAdminAnalyticsController } from './analytics.controller';
import { SuperAdminAnalyticsService } from './analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminAnalyticsController],
  providers: [SuperAdminAnalyticsService],
})
export class SuperAdminAnalyticsModule {}
