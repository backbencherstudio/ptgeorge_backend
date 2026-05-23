import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdsService } from './ads-manager.service';
import { AdsController } from './ads-manager.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AdsController],
  providers: [
    AdsService,
  ],
  exports: [AdsService],
})
export class AdsModule {}
