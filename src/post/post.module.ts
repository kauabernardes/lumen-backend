import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Post } from 'src/schema/post.entity';
import { Like } from 'src/schema/like.entity';
import { Member } from 'src/schema/member.entity';
import { Community } from 'src/schema/community.entity';
import { User } from 'src/schema/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Like, Member, Community, User])],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
