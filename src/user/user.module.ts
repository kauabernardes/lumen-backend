import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from 'src/schema/user.entity';

import { ParticipantSession } from 'src/schema/participant-session.entity';
import { DailyLog } from 'src/schema/daily-log.entity';
import { Post } from 'src/schema/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ParticipantSession, DailyLog, Post]),
  ],
  providers: [UserService],

  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
