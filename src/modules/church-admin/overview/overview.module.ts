import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChurchAdminAnalyticsController } from './overview.controller';
import { ChurchAdminAnalyticsService } from './overview.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChurchAdminAnalyticsController],
  providers: [ChurchAdminAnalyticsService],
})
export class ChurchAdminAnalyticsModule {}
