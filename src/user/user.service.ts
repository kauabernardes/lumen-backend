import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/schema/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string) {
    return this.userRepository.findOne({
      where: { id },

      select: {
        id: false,
        username: true,
        email: true,
      },
    });
  }

  async getUserProfile(
    profileUserId: string,
    loggedUserId: string,
  ) {
    const user = await this.userRepository.findOne({
      where: {
        id: profileUserId,
      },

      relations: [
        'communities',
        'communities.community',
        'communities.community.posts',
      ],
    });

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado',
      );
    }

    const loggedUser =
      await this.userRepository.findOne({
        where: {
          id: loggedUserId,
        },

        relations: [
          'communities',
          'communities.community',
        ],
      });

    const profileCommunityIds =
      user.communities.map(
        (community) =>
          community.community.id,
      );

    const loggedCommunityIds =
      loggedUser.communities.map(
        (community) =>
          community.community.id,
      );

    const commonCommunityIds =
      profileCommunityIds.filter((id) =>
        loggedCommunityIds.includes(id),
      );

    const commonPosts = [];

    for (const member of user.communities) {
      if (
        commonCommunityIds.includes(
          member.community.id,
        )
      ) {
        const posts =
          member.community.posts || [];

        commonPosts.push(...posts);
      }
    }

    return {
      username: user.username,

      email: user.email,

      createdAt: user.createdAt,

      communitiesCount:
        user.communities.length,

      communities: user.communities.map(
        (member) => ({
          id: member.community.id,
          name: member.community.name,
        }),
      ),

      commonPosts,
    };
  }
}