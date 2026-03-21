import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';

@Module({
  providers: [RewardService],
  controllers: [RewardController]
})
export class RewardModule {}
