import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward } from 'src/schema/reward.entity';
import { Earn } from 'src/schema/earn.entity';

@Injectable()
export class RewardService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
  ) {}

  async getRewardsByUser(userId: string) {
    try {
      const allRewards = await this.rewardRepository.find({
        relations: ['earns'],
      });

      const formattedRewards = allRewards.map((reward) => {
        const userEarns = reward.earns.filter((earn) => earn.userId === userId);
        const disponivel = userEarns.length === 0;
        const { earns, ...rewardData } = reward;

        return {
          ...rewardData,
          available: disponivel,
        };
      });

      return formattedRewards;
    } catch (error) {
      throw error;
    }
  }
}
