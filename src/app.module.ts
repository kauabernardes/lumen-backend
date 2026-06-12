import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionService } from './session/session.service';
import { SessionModule } from './session/session.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CommunityModule } from './community/community.module';
import { PostModule } from './post/post.module';
import { User } from './schema/user.entity';
import { Community } from './schema/community.entity';
import { Post } from './schema/post.entity';
import { Member } from './schema/member.entity';
import { Like } from './schema/like.entity';
import { Session } from './schema/session.entity';
import { ParticipantSession } from './schema/participant-session.entity';
import { Reward } from './schema/reward.entity';

import { DailyLog } from './schema/daily-log.entity';
import { DailyLogModule } from './daily-log/daily-log.module';
import { AiModule } from './ai/ai.module';
import { RewardModule } from './reward/reward.module';
import { UserReward } from './schema/user-reward.entity';
import { RecommendationModule } from './recommendation/recommedation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [
          User,
          Community,
          Post,
          Member,
          Like,
          Session,
          ParticipantSession,
          Reward,
          UserReward,
          DailyLog,
        ],
        logging: true,
        synchronize: false,
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
    }),
    PostModule,
    SessionModule,
    AuthModule,
    UserModule,
    CommunityModule,
    DailyLogModule,
    AiModule,
    RewardModule,
    RecommendationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
