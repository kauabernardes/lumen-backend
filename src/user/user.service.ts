import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/schema/user.entity';
import { ParticipantSession } from 'src/schema/participant-session.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(ParticipantSession)
    private readonly participantSessionRepository: Repository<ParticipantSession>,
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
  /*
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
          community.id,
      );

    const loggedCommunityIds =
      loggedUser.communities.map(
        (community) =>
          community.id,
      );

    const commonCommunityIds =
      profileCommunityIds.filter((id) =>
        loggedCommunityIds.includes(id),
      );

    const commonPosts = [];

    for (const member of user.communities) {
      if (
        commonCommunityIds.includes(
          member.id,
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
      communitiesCount:
        user.communities.length,

      communities: user.communities.map(
        (member) => ({
          id: member.,
          name: member.community.name,
        }),
      ),

      commonPosts,
    };
  } */

  async getMonthlyStudyChart(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 a 11

    const startDate = new Date(currentYear, currentMonth, 1);

    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const rawData = await this.participantSessionRepository
      .createQueryBuilder('ps')
      .select('EXTRACT(DAY FROM ps.createdAt)', 'day')
      .addSelect('SUM(ps.time)', 'totalSeconds')
      .where('ps.userId = :userId', { userId })
      .andWhere('ps.createdAt >= :startDate', { startDate })
      .andWhere('ps.createdAt <= :endDate', { endDate })
      .groupBy('EXTRACT(DAY FROM ps.createdAt)')
      .getRawMany();

    const daysInMonth = endDate.getDate();
    let chartData: {
      day: number;
      timeInMinutes: number;
      timeInSeconds: number;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const record = rawData.find((d) => Number(d.day) === day);

      const seconds = record ? Number(record.totalSeconds) : 0;

      chartData.push({
        day: day,
        timeInMinutes: Math.floor(seconds / 60),
        timeInSeconds: seconds,
      });
    }

    return {
      month: currentMonth + 1,
      year: currentYear,
      data: chartData,
    };
  }
}
