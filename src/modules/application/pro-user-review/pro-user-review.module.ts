import { Module } from '@nestjs/common';
import { ProUserReviewController } from './pro-user-review.controller';
import { ProUserReviewService } from './pro-user-review.service';
import { ProUserController } from '../pro-user/pro-user.controller';
import { ProUserService } from '../pro-user/pro-user.service';

@Module({
  controllers: [ProUserController, ProUserReviewController],
  providers: [ProUserService, ProUserReviewService],
})
export class ProUserModule {}
