import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { ParticipantSession } from './participant-session.entity';
import { Session } from './session.entity';
import { Member } from './member.entity';
import { Community } from './community.entity';
import { Post } from './post.entity';
import { DailyLog } from './daily-log.entity';
import { Reward } from './reward.entity';
import { UserReward } from './user-reward.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage?: string;

  @OneToMany(
    () => ParticipantSession,
    (participantSession) => participantSession.user,
  )
  participantSessions!: ParticipantSession[];

  @OneToMany(() => Session, (session) => session.host)
  sessions: Session[];

  @OneToMany(() => Member, (member) => member.user)
  members: Member[];

  @OneToMany(() => Community, (community) => community.author)
  communities: Community[];

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => DailyLog, (dailyLog) => dailyLog.user)
  dailyLogs: DailyLog[];

  @OneToMany(() => UserReward, (userReward) => userReward.user)
  userRewards: UserReward[];
}
