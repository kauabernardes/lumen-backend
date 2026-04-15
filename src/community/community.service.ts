import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Create } from './dto/create.dto';
import { PaginationDto } from 'src/util/dto/pagination.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: Create, userId: string) {
    try {
      const exist = await this.prisma.community.findFirst({
        where: {
          name: payload.name,
        },
      });
      if (exist) {
        throw new ConflictException('Comunidade com esse nome já existe');
      }

      const community = await this.prisma.community.create({
        data: {
          name: payload.name,
          description: payload.description || '',
          authorId: userId,
        },
      });
      return {
        message: 'Comunidade criada com sucesso',
        community: community,
      };
    } catch (error) {
      throw error;
    }
  }
  async join(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    const memberExist = await this.prisma.member.findUnique({
      where: {
        userId_communityId: { userId, communityId },
      },
    });

    if (memberExist) {
      throw new ConflictException('Você já faz parte desta comunidade');
    }

    const member = await this.prisma.member.create({
      data: { userId, communityId },
    });

    return {
      message: 'Inscrição realizada com sucesso',
      member,
    };
  }

  async getRecommended(userId: string, pagination: PaginationDto) {
    const { page: pageString, limit: limitString } = pagination;
    const page = Number(pageString);
    const limit = Number(limitString);

    const skip = (page - 1) * limit;

    try {
      const [communities, total] = await this.prisma.$transaction([
        this.prisma.community.findMany({
          skip: skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { username: true } },
            _count: { select: { members: true } },
          },
        }),
        this.prisma.community.count({
          where: {
            members: { none: { userId: userId } },
          },
        }),
      ]);

      return {
        data: communities,
        meta: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getById(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        author: { select: { username: true } },
        _count: { select: { members: true } },
      },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    return community;
  }

  async getPosts(communityId: string, pagination: PaginationDto) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const communityExists = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!communityExists) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    try {
      const [posts, total] = await this.prisma.$transaction([
        this.prisma.post.findMany({
          where: { communityId: communityId },
          skip: skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.post.count({
          where: { communityId: communityId },
        }),
      ]);

      return {
        data: posts,
        meta: {
          total,
          page,
          lastPage: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
