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
import { RewardModule } from './reward/reward.module';
import { PostModule } from './post/post.module';
import { User } from './schema/user.entity';
import { Community } from './schema/community.entity';
import { Post } from './schema/post.entity';
import { Member } from './schema/member.entity';
import { Like } from './schema/like.entity';
import { Session } from './schema/session.entity';
import { ParticipantSession } from './schema/participant-session.entity';
import { Reward } from './schema/reward.entity';
import { Earn } from './schema/earn.entity';

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
          Earn,
        ],
        logging: true,
        synchronize: true, // Set to false in production
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
    RewardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
