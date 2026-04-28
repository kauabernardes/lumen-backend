// daily-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('daily_logs')
export class DailyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.dailyLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  mood: string;

  @Column('text')
  studiedYesterday: string;

  @Column()
  achievedGoal: string;

  @Column('text')
  studyToday: string;

  @CreateDateColumn()
  createdAt: Date;
}
