import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Community } from 'src/schema/community.entity';
import { Member } from 'src/schema/member.entity';
import { Post } from 'src/schema/post.entity';
import { Create } from './dto/create.dto';
import { PaginationDto } from 'src/util/dto/pagination.dto';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

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

      const savedCommunity = await this.communityRepository.save(community);

      const member = this.memberRepository.create({
        userId,
        communityId: savedCommunity.id,
      });

      await this.memberRepository.save(member);

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

          return [communitiesList, totalCount];
        },
      );

      const queryBuilder = this.communityRepository
        .createQueryBuilder('community')
        .leftJoinAndSelect('community.author', 'author')
        .leftJoinAndSelect(
          'community.members',
          'members',
          'members.userId = :userId',
          { userId },
        )
        .loadRelationCountAndMap('community.membersCount', 'community.members')
        .skip(skip)
        .take(limit)
        .orderBy('community.createdAt', 'DESC');

      const [communitiesWithRelations, totalCount] = await Promise.all([
        queryBuilder.getMany(),
        this.communityRepository.count(),
      ]);

      const formattedCommunities = communitiesWithRelations.map(
        (community: any) => {
          const isMember = community.members && community.members.length > 0;

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
        this.postRepository.count({
          where: { communityId, parentId: IsNull() },
        }),
      ]);

      const commentsCount = await Promise.all(
        posts.map((post) =>
          this.postRepository.count({ where: { parentId: post.id } }),
        ),
      );

      const postsWithLikedStatus = posts.map((post: any) => ({
        ...post,
        isLiked: post.likes && post.likes.length > 0,
        likes: undefined,
        likesCount: post.likesCount,
        commentsCount: commentsCount[posts.indexOf(post)],
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

  async getIn(userId: string, pagination: PaginationDto) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const queryBuilder = this.communityRepository
        .createQueryBuilder('community')
        .innerJoin('community.members', 'members', 'members.userId = :userId', {
          userId,
        })
        .loadRelationCountAndMap('community.membersCount', 'community.members')
        .skip(skip)
        .take(limit);

      // Usando getManyAndCount para pegar os dados e o total real
      const [communities, total] = await queryBuilder.getManyAndCount();

      // Calculando a última página baseado no total e no limite
      const lastPage = Math.ceil(total / limit) || 1;

      return {
        data: communities.map((community: any) => ({
          ...community,
          isMember: true,
        })),
        meta: {
          total,
          page,
          lastPage,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getNotIn(userId: string, pagination: PaginationDto) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const queryBuilder = this.communityRepository
        .createQueryBuilder('community')
        // Tenta fazer o join com o registro do usuário específico
        .leftJoin('community.members', 'members', 'members.userId = :userId', {
          userId,
        })
        // Filtra apenas as comunidades onde o join anterior resultou em null (usuário não está)
        .where('members.userId IS NULL')
        .loadRelationCountAndMap('community.membersCount', 'community.members')
        .skip(skip)
        .take(limit);

      const [communities, total] = await queryBuilder.getManyAndCount();

      const lastPage = Math.ceil(total / limit) || 1;

      return {
        data: communities.map((community: any) => ({
          ...community,
          isMember: false, // Alterado para false
        })),
        meta: {
          total,
          page,
          lastPage,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
