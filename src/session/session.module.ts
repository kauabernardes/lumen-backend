import { Module } from '@nestjs/common';
import { SessionGateway } from './session.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  providers: [SessionGateway, SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
