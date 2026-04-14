import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async createPost(data: CreatePostDto, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: data.communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    const member = await this.prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: data.communityId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Usuário não pertence à comunidade');
    }

    return this.prisma.post.create({
      data: {
        content: data.content,
        userId,
        communityId: data.communityId,
      },
    });
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    const likeWhere = {
      userId_postId: { userId, postId },
    };

    const existingLike = await this.prisma.like.findUnique({
      where: likeWhere,
    });

    let liked: boolean;

    if (existingLike) {
      await this.prisma.like.delete({ where: likeWhere });
      liked = false;
    } else {
      await this.prisma.like.create({
        data: { userId, postId },
      });
      liked = true;
    }

    const totalLikes = await this.prisma.like.count({
      where: { postId },
    });

    return { liked, totalLikes };
  }
}