import { Module } from '@nestjs/common';
import { ProUserController } from './memeber-request.controller';
import { ProUserService } from './memeber-request.service';

@Module({
  controllers: [ProUserController],
  providers: [ProUserService],
})
export class ProUserModule {}
