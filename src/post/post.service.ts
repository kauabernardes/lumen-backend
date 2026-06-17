import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from 'src/schema/post.entity';
import { Community } from 'src/schema/community.entity';
import { Member } from 'src/schema/member.entity';
import { Like } from 'src/schema/like.entity';
import { CreateComment } from './dto/create-comment.dto';
import { PaginationDto } from 'src/util/dto/pagination.dto';
import { PaginatedPostsResponseDto } from './dto/post-response.dto';
import { User } from 'src/schema/user.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createPost(data: CreatePostDto, userId: string) {
    const community = await this.communityRepository.findOne({
      where: { id: data.communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    const member = await this.memberRepository.findOne({
      where: {
        userId: userId,
        communityId: data.communityId,
      },
      relations: ['user'],
    });

    if (!member) {
      throw new ForbiddenException('Usuário não pertence à comunidade');
    }

    const post = this.postRepository.create({
      content: data.content,
      userId: userId,
      communityId: data.communityId,
    });
    await this.postRepository.save(post);

    return {
      ...post,
      user: { username: member.user.username },
      community: { name: community.name },
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    const existingLike = await this.likeRepository.findOne({
      where: { userId, postId },
    });

    let liked: boolean;

    if (existingLike) {
      await this.likeRepository.remove(existingLike);
      liked = false;
    } else {
      const newLike = this.likeRepository.create({ userId, postId });
      await this.likeRepository.save(newLike);
      liked = true;
    }

    const totalLikes = await this.likeRepository.count({
      where: { postId },
    });

    return { liked, totalLikes };
  }

  async getPost(postId: string, userId: string) {
    const postQuery = this.postRepository
      .createQueryBuilder('post')
      .select(['post.id', 'post.content', 'post.createdAt', 'post.parentId'])
      .leftJoin('post.user', 'user')
      .addSelect(['user.id', 'user.username', 'user.profileImage'])
      .leftJoin('post.community', 'community')
      .addSelect(['community.id', 'community.name'])

      .leftJoin('post.parent', 'parentPost')
      .addSelect(['parentPost.id', 'parentPost.content'])
      .leftJoin('parentPost.user', 'parentUser')
      .addSelect(['parentUser.id', 'parentUser.username'])

      .leftJoinAndSelect('post.likes', 'likes', 'likes.userId = :userId', {
        userId,
      })
      .loadRelationCountAndMap('post.likesCount', 'post.likes')
      .where('post.id = :postId', { postId });

    const post: any = await postQuery.getOne();

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    const commentsQuery = this.postRepository
      .createQueryBuilder('comment')
      .select(['comment.id', 'comment.content', 'comment.createdAt'])
      .leftJoin('comment.user', 'user')
      .addSelect(['user.id', 'user.username', 'user.profileImage'])
      .leftJoinAndSelect('comment.likes', 'likes', 'likes.userId = :userId', {
        userId,
      })
      .loadRelationCountAndMap('comment.likesCount', 'comment.likes')
      .where('comment.parentId = :postId', { postId })
      .orderBy('comment.createdAt', 'ASC');

    const comments: any[] = await commentsQuery.getMany();

    const commentsRepliesCount = await Promise.all(
      comments.map((comment) =>
        this.postRepository.count({ where: { parentId: comment.id } }),
      ),
    );

    const formattedComments = comments.map((comment, index) => {
      return {
        ...comment,
        isLiked: comment.likes && comment.likes.length > 0,
        likes: undefined,
        likesCount: comment.likesCount || 0,
        commentsCount: commentsRepliesCount[index] || 0,
      };
    });

    return {
      ...post,
      isLiked: post.likes && post.likes.length > 0,
      likes: undefined,
      likesCount: post.likesCount || 0,
      commentsCount: formattedComments.length,
      comments: formattedComments,
    };
  }

  async createComment(postId: string, content: string, sub: any) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    const user = await this.userRepository.findOne({
      where: { id: sub },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const comment = this.postRepository.create({
      content: content,
      userId: sub,
      communityId: post.communityId,
      parentId: postId,
      user: { username: user.username, profileImage: user.profileImage },
    });
    await this.postRepository.save(comment);
    return comment;
  }

  async getRecommendedPosts(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedPostsResponseDto> {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .innerJoin(
          Member,
          'member',
          'member.communityId = post.communityId AND member.userId = :userId',
          { userId },
        )
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('post.community', 'community')
        .leftJoinAndSelect('post.likes', 'likes', 'likes.userId = :userId', {
          userId,
        })
        .loadRelationCountAndMap('post.likesCount', 'post.likes')
        .where('post.parentId IS NULL')
        .orderBy('post.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      const commentsCount = await Promise.all(
        posts.map((post) =>
          this.postRepository.count({ where: { parentId: post.id } }),
        ),
      );

      const postsWithLikedStatus = posts.map((post: any, index: number) => ({
        ...post,
        isLiked: post.likes && post.likes.length > 0,
        likes: undefined,
        likesCount: post.likesCount || 0,
        commentsCount: commentsCount[index],
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
