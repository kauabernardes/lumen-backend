import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePostDto, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    const isMember = await this.prisma.communityMember.findFirst({
      where: {
        userId: userId,
        communityId: dto.communityId,
      },
    });

    if (!isMember) {
      throw new ForbiddenException(
        'Usuário não é membro da comunidade',
      );
    }

    const post = await this.prisma.post.create({
      data: {
        content: dto.content,
        userId: userId,
        communityId: dto.communityId,
      },
    });

    return {
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      userId: post.userId,
      communityId: post.communityId,
    };
  }

  async findOne(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    const isMember = await this.prisma.communityMember.findFirst({
      where: {
        userId: userId,
        communityId: post.communityId,
      },
    });

    if (!isMember) {
      throw new ForbiddenException(
        'Usuário não tem acesso a este post',
      );
    }

    return post;
  }

  async search(content?: string, date?: string, userId?: string) {
  const posts = await this.prisma.post.findMany({
    where: {
      AND: [
        content
          ? {
              content: {
                contains: content,
                mode: 'insensitive',
              },
            }
          : {},
        date
          ? {
              createdAt: {
                gte: new Date(date),
                lt: new Date(new Date(date).setHours(23, 59, 59)),
              },
            }
          : {},
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return posts;
}