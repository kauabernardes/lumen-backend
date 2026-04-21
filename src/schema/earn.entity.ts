import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Reward } from './reward.entity';
import { User } from './user.entity';

@Entity()
@Unique(['rewardId', 'userId'])
export class Earn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  rewardId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Reward, (reward) => reward.earns)
  @JoinColumn({ name: 'rewardId' })
  reward!: Reward;

  @ManyToOne(() => User, (user) => user.earns)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
