import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ParticipantSession } from './participant-session.entity';
import { Session } from './session.entity';
import { Member } from './member.entity';
import { Community } from './community.entity';
import { Earn } from './earn.entity';
import { Post } from './post.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @OneToMany(
    () => ParticipantSession,
    (participantSession) => participantSession.user,
  )
  participantSessions!: ParticipantSession[];

  @OneToMany(() => Session, (session) => session.host)
  sessions!: Session[];

  @OneToMany(() => Member, (member) => member.user)
  members!: Member[];

  @OneToMany(() => Community, (community) => community.author)
  communities!: Community[];

  @OneToMany(() => Earn, (earn) => earn.user)
  earns!: Earn[];

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[];
}
