import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Member } from './member.entity';
import { Post } from './post.entity';

@Entity()
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Index()
  @Column({ type: 'uuid' })
  authorId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.communities)
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @OneToMany(() => Member, (member) => member.community)
  members!: Member[];

  @OneToMany(() => Post, (post) => post.community)
  posts!: Post[];
}
