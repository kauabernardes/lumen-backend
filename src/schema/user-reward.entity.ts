import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Reward } from "./reward.entity";

@Entity()
export class UserReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean' })
  isCorrect: boolean;

  @ManyToOne(() => User, (user) => user.userRewards)
  user: User;

  @ManyToOne(() => Reward, (reward) => reward.userRewards)
  reward: Reward;
}