// daily-log.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    if (today) {
      const existingLog = await this.dailyLogRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (
        existingLog?.createdAt.toISOString().split('T')[0] ==
        today.toISOString().split('T')[0]
      ) {
        throw new ConflictException('Você já registrou um check-in hoje.'); // Lança um erro se já existir um log para a mesma data
      }
    }

    const log = this.dailyLogRepository.create({
      ...dto,
      userId,
    });

    return await this.dailyLogRepository.save(log);
  }

  async getSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas

    // 1. BUSCAR TODOS OS LOGS DO USUÁRIO (Ordenados por data)
    const allLogs = await this.dailyLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // --- CÁLCULO DA OFENSIVA (STREAK) ---
    let streak = 0;
    let currentDateToCheck = new Date(today);

    // Verifica se o usuário já fez check-in hoje ou se o streak começa a contar de ontem
    const hasLogToday = allLogs.some(
      (log) =>
        log.createdAt.toISOString().split('T')[0] ===
        today.toISOString().split('T')[0],
    );
    if (!hasLogToday) {
      currentDateToCheck.setDate(currentDateToCheck.getDate() - 1); // Começa checando ontem
    }

    // Conta os dias seguidos
    for (const log of allLogs) {
      const logDate = new Date(log.createdAt);
      logDate.setHours(0, 0, 0, 0); // Garante que fuso horário não atrapalhe

      const targetDateStr = currentDateToCheck.toISOString().split('T')[0];
      const logDateStr = logDate.toISOString().split('T')[0];

      if (logDateStr === targetDateStr) {
        streak++;
        currentDateToCheck.setDate(currentDateToCheck.getDate() - 1); // Volta um dia
      } else if (logDate > currentDateToCheck) {
        continue; // Pula logs duplicados no mesmo dia
      } else {
        break; // A sequência quebrou
      }
    }

    // --- CÁLCULO DA SEMANA ATUAL ---
    const dayOfWeek = today.getDay(); // 0 = Domingo, 6 = Sábado
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Volta para Domingo

    // Cria um array de 7 posições com true/false
    const weeklyStatus: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(startOfWeek.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const hasLog = allLogs.some(
        (log) => log.createdAt.toISOString().split('T')[0] === dateStr,
      );
      weeklyStatus.push(hasLog);
    }

    // --- ESTATÍSTICAS GERAIS ---
    const totalCheckins = allLogs.length;
    const achievedGoals = allLogs.filter(
      (log) => log.achievedGoal === 'sim',
    ).length;
    const goalPercentage =
      totalCheckins > 0 ? Math.round((achievedGoals / totalCheckins) * 100) : 0;

    // --- BUSCAR TOTAL DE HORAS ESTUDADAS ---
    // Faz a soma direto no banco de dados para ser performático
    const userParticipantSessions =
      await this.participantSessionRepository.find({
        where: { userId },
      });

    console.log(userParticipantSessions);

    const timeResult = await this.participantSessionRepository
      .createQueryBuilder('ps')
      .select('SUM(ps.time)', 'totalSeconds')
      .where('ps.userId = :userId', { userId })
      .getRawOne();

    console.log(timeResult); // Verifique o resultado bruto para garantir que a consulta está correta

    const totalSeconds = Number(timeResult.totalSeconds) || 0;

    // Converte os segundos para horas arredondando para baixo (se quiser decimais, pode usar (totalSeconds / 3600).toFixed(1))
    const hoursStudied = Math.floor(totalSeconds / 3600);

    // Retorna o objeto exatamente como o frontend precisa!
    return {
      streak: streak,
      weekly: weeklyStatus,
      stats: {
        totalCheckins,
        goalPercentage,
        hoursStudied,
        //subjectsStudied: 3,
      },
    };
  }
}
