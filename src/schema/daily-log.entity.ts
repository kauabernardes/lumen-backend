import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('daily_logs')
export class DailyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  mood: string;

  @Column('text')
  summary: string;

  @CreateDateColumn()
  createdAt: Date;
}