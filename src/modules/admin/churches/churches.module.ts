import { Module } from '@nestjs/common';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from 'src/common/repository/user/user.repository';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ChurchesController],
  providers: [ChurchesService, PermissionsGuard],
})
export class ChurchesModule {}
