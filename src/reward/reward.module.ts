import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { Reward } from 'src/schema/reward.entity';
import { Earn } from 'src/schema/earn.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reward, Earn])],
  providers: [RewardService],
  controllers: [RewardController],
})
export class RewardModule {}
