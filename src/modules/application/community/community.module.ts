import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { CommunityUtils } from './utils/community.utils';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService,CommunityUtils],
})
export class CommunityModule {}
