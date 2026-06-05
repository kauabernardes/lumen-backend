import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { UserReward } from './user-reward.entity';

@Entity()
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 32 })
  difficulty: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

@OneToMany(() => UserReward, (ur) => ur.reward) userRewards: UserReward[];
}