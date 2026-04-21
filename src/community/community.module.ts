import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { Community } from 'src/schema/community.entity';
import { Member } from 'src/schema/member.entity';
import { Post } from 'src/schema/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Community, Member, Post])],
  providers: [CommunityService],
  controllers: [CommunityController],
})
export class CommunityModule {}
