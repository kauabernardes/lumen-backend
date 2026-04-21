import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Community } from 'src/schema/community.entity';
import { Member } from 'src/schema/member.entity';
import { Post } from 'src/schema/post.entity';
import { Create } from './dto/create.dto';
import { PaginationDto } from 'src/util/dto/pagination.dto';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly dataSource: DataSource,
  ) {}

  async create(payload: Create, userId: string) {
    try {
      const exist = await this.communityRepository.findOne({
        where: { name: payload.name },
      });
      if (exist) {
        throw new ConflictException('Comunidade com esse nome já existe');
      }

      const community = this.communityRepository.create({
        name: payload.name,
        description: payload.description || '',
        authorId: userId,
      });
      await this.communityRepository.save(community);

      return {
        message: 'Comunidade criada com sucesso',
        community: community,
      };
    } catch (error) {
      throw error;
    }
  }

  async join(communityId: string, userId: string) {
    const community = await this.communityRepository.findOne({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    const memberExist = await this.memberRepository.findOne({
      where: { userId, communityId },
    });

    if (memberExist) {
      throw new ConflictException('Você já faz parte desta comunidade');
    }

    const member = this.memberRepository.create({ userId, communityId });
    await this.memberRepository.save(member);

    return {
      message: 'Inscrição realizada com sucesso',
      member,
    };
  }

  async getRecommended(userId: string, pagination: PaginationDto) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const [communities, total] = await this.dataSource.transaction(
        async (manager) => {
          const communityRepo = manager.getRepository(Community);
          const memberRepo = manager.getRepository(Member);

          const [communitiesList, totalCount] = await Promise.all([
            communityRepo.find({
              skip: skip,
              take: limit,
              order: { createdAt: 'desc' },
              relations: ['author', 'members'],
            }),
            communityRepo.count(),
          ]);

          // In TypeORM, we have to manually filter/format if we want complex 'where' in relations like Prisma
          // or use QueryBuilder for more efficiency.
          // Here we simulate the Prisma 'include' with 'where' in members.

          // For simplicity and to match Prisma behavior exactly for the user,
          // we'll fetch members for each community and filter locally,
          // OR better, use a QueryBuilder to do it in one go.

          // Let's try a QueryBuilder approach for better performance.
          return [communitiesList, totalCount];
        },
      );

      // Re-implementing with QueryBuilder to handle the specific Prisma 'include' logic
      const queryBuilder = this.communityRepository
        .createQueryBuilder('community')
        .leftJoinAndSelect('community.author', 'author')
        .leftJoinAndSelect(
          'community.members',
          'members',
          'members.userId = :userId',
          { userId },
        )
        .loadRelationCountAndMap('community.membersCount', 'community.members') // Custom field might be needed in Entity
        .skip(skip)
        .take(limit)
        .orderBy('community.createdAt', 'DESC');

      const [communitiesWithRelations, totalCount] = await Promise.all([
        queryBuilder.getMany(),
        this.communityRepository.count(),
      ]);

      // Note: TypeORM doesn't automatically add '_count' like Prisma.
      // I'll assume the user might need to adjust the entity or use a manual count.
      // For now, I'll format the response to match the existing API.

      const formattedCommunities = communitiesWithRelations.map(
        (community: any) => {
          // In TypeORM, if we leftJoinAndSelect with a filter, 'members' will only contain the filtered ones.
          const isMember = community.members && community.members.length > 0;

          // Remove members from the response as per the original implementation
          const { members, ...rest } = community;

          return {
            ...rest,
            isMember: isMember,
          };
        },
      );

      return {
        data: formattedCommunities,
        meta: {
          total: totalCount,
          page,
          lastPage: Math.ceil(totalCount / limit) || 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getById(communityId: string) {
    const community = await this.communityRepository.findOne({
      where: { id: communityId },
      relations: ['author'],
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    // Manually adding the count if needed, or relying on relations
    // The original implementation used _count: { select: { members: true } }
    // In TypeORM, we can use a subquery or just count the relations if loaded.
    // For simplicity, I'll add a property to the returned object.
    const memberCount = await this.dataSource.getRepository(Member).count({
      where: { communityId },
    });

    return {
      ...community,
      membersCount: memberCount,
    } as any;
  }

  async getPosts(
    communityId: string,
    pagination: PaginationDto,
    userId?: string,
  ) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const communityExists = await this.communityRepository.findOne({
      where: { id: communityId },
    });

    if (!communityExists) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    try {
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('post.community', 'community')
        .leftJoinAndSelect('post.likes', 'likes', 'likes.userId = :userId', {
          userId,
        })
        .loadRelationCountAndMap('post.likesCount', 'post.likes')
        .where('post.communityId = :communityId', { communityId })
        .andWhere('post.parentId IS NULL')
        .orderBy('post.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [posts, total] = await Promise.all([
        queryBuilder.getMany(),
        this.postRepository.count({ where: { communityId } }),
      ]);

      const postsWithLikedStatus = posts.map((post: any) => ({
        ...post,
        isLiked: post.likes && post.likes.length > 0,
        likes: undefined,
        likesCount: post.likesCount,
      }));

      return {
        data: postsWithLikedStatus,
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
