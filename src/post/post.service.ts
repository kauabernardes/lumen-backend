import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { Post } from 'src/schema/post.entity';
import { Community } from 'src/schema/community.entity';
import { Member } from 'src/schema/member.entity';
import { Like } from 'src/schema/like.entity';
import { CreateComment } from './dto/create-comment.dto';

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
      .select([
        'post.id',
        'post.content',
        'post.createdAt',
        'post.parentId',
      ])
      .leftJoin('post.user', 'user')
      .addSelect(['user.id', 'user.username'])
      .leftJoin('post.community', 'community')
      .addSelect(['community.id', 'community.name'])
      
      // 1. Join com a relação do post pai (Verifique se o nome na sua Entidade é 'parent' ou 'parentId')
      .leftJoin('post.parent', 'parentPost') 
      .addSelect(['parentPost.id', 'parentPost.content'])
      
      // 2. NOVO: Join com o usuário do post pai
      .leftJoin('parentPost.user', 'parentUser')
      .addSelect(['parentUser.id', 'parentUser.username'])

      .leftJoinAndSelect('post.likes', 'likes', 'likes.userId = :userId', { userId })
      .loadRelationCountAndMap('post.likesCount', 'post.likes')
      .where('post.id = :postId', { postId });

    const post: any = await postQuery.getOne();

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    const commentsQuery = this.postRepository
      .createQueryBuilder('comment')
      .select([
        'comment.id',
        'comment.content',
        'comment.createdAt'
      ])
      .leftJoin('comment.user', 'user')
      .addSelect(['user.id', 'user.username'])
      .leftJoinAndSelect('comment.likes', 'likes', 'likes.userId = :userId', { userId })
      .loadRelationCountAndMap('comment.likesCount', 'comment.likes')
      .where('comment.parentId = :postId', { postId })
      .orderBy('comment.createdAt', 'ASC');

    const comments: any[] = await commentsQuery.getMany();

    const commentsRepliesCount = await Promise.all(
      comments.map((comment) =>
        this.postRepository.count({ where: { parentId: comment.id } })
      )
    );

    const formattedComments = comments.map((comment, index) => { 
      return {
        ...comment,
        isLiked: comment.likes && comment.likes.length > 0,
        likes: undefined,
        likesCount: comment.likesCount || 0,
        commentsCount: commentsRepliesCount[index] || 0, 
      }
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

    const comment = this.postRepository.create({
      content: content,
      userId: sub,
      communityId: post.communityId,
      parentId: postId,
    });
    await this.postRepository.save(comment);
    return comment;
  }
}
