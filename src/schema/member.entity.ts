import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Community } from './community.entity';

@Entity()
@Unique(['userId', 'communityId'])
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  communityId!: string;

  @ManyToOne(() => User, (user) => user.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Community, (community) => community.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'communityId' })
  community!: Community;
}
