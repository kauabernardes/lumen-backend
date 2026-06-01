// daily-log.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DailyLog } from '../schema/daily-log.entity';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { ParticipantSession } from 'src/schema/participant-session.entity';

@Injectable()
export class DailyLogService {
  constructor(
    @InjectRepository(DailyLog)
    private dailyLogRepository: Repository<DailyLog>,
    @InjectRepository(ParticipantSession)
    private readonly participantSessionRepository: Repository<ParticipantSession>,
  ) {}

  async create(dto: CreateDailyLogDto, userId: string) {
    const today = new Date();

    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Função auxiliar blindada contra fuso horário (zera a hora e retorna os milissegundos)
    const normalizeDate = (date: Date | string) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    const todayTime = normalizeDate(today);

    // --- DEFINIÇÃO DOS LIMITES DA SEMANA ---
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const allLogs = await this.dailyLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // --- CÁLCULO DA OFENSIVA (STREAK) ---
    let streak = 0;
    let currentDateToCheck = new Date(today);
    let currentTargetTime = todayTime;

    // Verifica se tem log hoje sem usar toISOString
    const hasLogToday = allLogs.some(
      (log) => normalizeDate(log.createdAt) === todayTime,
    );

    if (!hasLogToday) {
      currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
      currentTargetTime = normalizeDate(currentDateToCheck);
    }

    for (const log of allLogs) {
      const logTime = normalizeDate(log.createdAt);

      if (logTime === currentTargetTime) {
        streak++;
        // Volta um dia para o próximo alvo
        currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
        currentTargetTime = normalizeDate(currentDateToCheck);
      } else if (logTime > currentTargetTime) {
        continue; // Pula múltiplos logs no mesmo dia
      } else {
        break; // A sequência quebrou
      }
    }

    // --- CÁLCULO DA SEMANA ATUAL ---
    const weeklyStatus: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(startOfWeek.getDate() + i);
      const checkTime = normalizeDate(checkDate);

      // Compara os milissegundos ao invés de strings
      const hasLog = allLogs.some(
        (log) => normalizeDate(log.createdAt) === checkTime,
      );
      weeklyStatus.push(hasLog);
    }

    // --- ESTATÍSTICAS GERAIS ---
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
