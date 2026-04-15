import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { SessionService } from './session/session.service';
import { SessionModule } from './session/session.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CommunityModule } from './community/community.module';
import { RewardModule } from './reward/reward.module';
import { PostModule } from './post/post.module';

@Module({
  imports: [
    PostModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SessionModule,
    AuthModule,
    UserModule,
    CommunityModule,
    RewardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
