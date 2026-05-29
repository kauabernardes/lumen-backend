import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';

import { Reward } from 'src/schema/reward.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReward } from 'src/schema/user-reward.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reward, UserReward])
  ],
  exports: [RewardService],
  providers: [RewardService]
})
export class RewardModule {}
