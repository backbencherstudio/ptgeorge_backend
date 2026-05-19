import { Module } from '@nestjs/common';
import { ChurchMembersController } from './members-directory.controller';
import { ChurchMembersService } from './members-directory.service';

@Module({
  controllers: [ChurchMembersController],
  providers: [ChurchMembersService],
})
export class ChurchMembersModule {}
