import { Module } from '@nestjs/common';
import { SessionGateway } from './session.gateway';
import { UserModule } from 'src/user/user.module';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/schema/session.entity';
import { ParticipantSession } from 'src/schema/participant-session.entity';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([Session, ParticipantSession]),
  ],
  providers: [SessionGateway, SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
