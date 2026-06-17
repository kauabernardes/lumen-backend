import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DailyLog } from '../schema/daily-log.entity';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { ParticipantSession } from 'src/schema/participant-session.entity';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class DailyLogService {
  constructor(
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    @InjectRepository(ParticipantSession)
    private readonly participantSessionRepository: Repository<ParticipantSession>,
  ) {}

  async create(dto: CreateDailyLogDto, userId: string) {
    const now = dayjs().tz('America/Sao_Paulo');

    const startOfDay = now.startOf('day').toDate();
    const endOfDay = now.endOf('day').toDate();

    const existingLog = await this.dailyLogRepository.findOne({
      where: {
        userId,
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    if (existingLog) {
      throw new ConflictException('Você já registrou um check-in hoje.');
    }

    const log = this.dailyLogRepository.create({
      ...dto,
      userId,
    });

    return await this.dailyLogRepository.save(log);
  }

  async getSummary(userId: string) {
    const now = dayjs().tz('America/Sao_Paulo');

    const startOfWeek = now.startOf('week').toDate();
    const endOfWeek = now.endOf('week').toDate();

    const allLogs = await this.dailyLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const getDateString = (date: Date | string) =>
      dayjs(date).tz('America/Sao_Paulo').format('YYYY-MM-DD');

    const todayString = getDateString(now.toDate());

    let streak = 0;
    let currentDateToCheck = now;
    let currentTargetString = todayString;

    const hasLogToday = allLogs.some(
      (log) => getDateString(log.createdAt) === todayString,
    );

    if (!hasLogToday) {
      currentDateToCheck = currentDateToCheck.subtract(1, 'day');
      currentTargetString = getDateString(currentDateToCheck.toDate());
    }

    for (const log of allLogs) {
      const logString = getDateString(log.createdAt);

      if (logString === currentTargetString) {
        streak++;
        currentDateToCheck = currentDateToCheck.subtract(1, 'day');
        currentTargetString = getDateString(currentDateToCheck.toDate());
      } else if (logString > currentTargetString) {
        continue;
      } else {
        break;
      }
    }

    const weeklyStatus: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const checkDateString = dayjs(startOfWeek)
        .add(i, 'day')
        .format('YYYY-MM-DD');

      const hasLog = allLogs.some(
        (log) => getDateString(log.createdAt) === checkDateString,
      );
      weeklyStatus.push(hasLog);
    }

    const logsThisWeek = allLogs.filter((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= startOfWeek && logDate <= endOfWeek;
    });

    const totalCheckins = logsThisWeek.length;
    const achievedGoals = logsThisWeek.filter(
      (log) => log.achievedGoal === 'sim',
    ).length;

    const goalPercentage =
      totalCheckins > 0 ? Math.round((achievedGoals / totalCheckins) * 100) : 0;

    const timeResult = await this.participantSessionRepository
      .createQueryBuilder('ps')
      .select('SUM(ps.time)', 'totalSeconds')
      .where('ps.userId = :userId', { userId })
      .andWhere('ps.createdAt >= :startOfWeek', { startOfWeek })
      .andWhere('ps.createdAt <= :endOfWeek', { endOfWeek })
      .getRawOne();

    const totalSeconds = Number(timeResult.totalSeconds) || 0;
    const hoursStudied = Math.floor(totalSeconds / 3600);

    return {
      streak: streak,
      weekly: weeklyStatus,
      stats: {
        totalCheckins,
        goalPercentage,
        hoursStudied,
      },
    };
  }
}
