import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from 'src/schema/user.entity';

import { ParticipantSession } from 'src/schema/participant-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ParticipantSession])],
  providers: [UserService],

  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
