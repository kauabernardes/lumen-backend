import { Injectable } from '@nestjs/common';
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
      select: { id: false, username: true, email: true },
    });
  }

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
