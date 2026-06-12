import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnswerByDto } from 'src/ai/dto/answer-by.dto';
import { Reward } from 'src/schema/reward.entity';
import { UserReward } from 'src/schema/user-reward.entity';

@Injectable()
export class RewardService {

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) {}

    
    async getRewardByAnswerIaValidate(answers: AnswerByDto[], difficulty: string, title: string): Promise<void> {
        await this.dataSource.transaction(async (transactionalEntityManager) => {
            const reward = transactionalEntityManager.create(Reward, {
                title: title,
                difficulty: difficulty
            });
            const savedReward = await transactionalEntityManager.save(reward);

            const userRewards = answers.map(answer => {
                return transactionalEntityManager.create(UserReward, {
                    reward: { id: savedReward.id },
                    user: { id: answer.userId },
                    isCorrect: answer.isCorrect
                });
            });

            console.log('Saved Reward:', savedReward);
            const savedUserRewards = await transactionalEntityManager.save(userRewards);
            console.log('User Rewards to be saved:', savedUserRewards);
        });
    }

   
    async getUserRewards(userId: string) {
       
        const allRewards = await this.dataSource.getRepository(Reward).find();

       
        const completedUserRewards = await this.dataSource.getRepository(UserReward).find({
            where: { 
                user: { id: userId }
               
            },
            relations: ['reward'],
        });

       
        const completedIds = new Set(completedUserRewards.map((ur) => ur.reward?.id));

       
        return allRewards.map((reward) => ({
            rewardId: reward.id,
            title: reward.title,
            points: parseInt(reward.difficulty) || 0, 
            completed: completedIds.has(reward.id), 
        }));
    }
}