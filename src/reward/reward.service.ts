import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RewardService {
  constructor(private readonly prisma: PrismaService) {}

  async getRewardsByUser(userId: string) {
    try {
      const allRewards = await this.prisma.reward.findMany({
        include: {
          earns: {
            where: { userId: userId },
            select: { id: true },
          },
        },
      });

      const formattedRewards = allRewards.map((reward) => {
        const disponivel = reward.earns.length === 0;
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
