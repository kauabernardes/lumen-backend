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
}
