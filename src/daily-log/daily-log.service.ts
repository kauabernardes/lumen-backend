// daily-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyLog } from '../schema/daily-log.entity';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';

@Injectable()
export class DailyLogService {
  
  constructor(
    @InjectRepository(DailyLog)
    private repo: Repository<DailyLog>,
  ) {}

  async create(dto: CreateDailyLogDto, userId: string) {
    const log = this.repo.create({
      ...dto,
      userId,
    });

    return await this.repo.save(log);
  }

async getSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas

    // 1. BUSCAR TODOS OS LOGS DO USUÁRIO (Ordenados por data)
    const allLogs = await this.repo.find({
      where: { userId },
      order: { date: 'DESC' },
    });

    // --- CÁLCULO DA OFENSIVA (STREAK) ---
    let streak = 0;
    let currentDateToCheck = new Date(today);

    // Verifica se o usuário já fez check-in hoje ou se o streak começa a contar de ontem
    const hasLogToday = allLogs.some(log => log.date === today.toISOString().split('T')[0]);
    if (!hasLogToday) {
      currentDateToCheck.setDate(currentDateToCheck.getDate() - 1); // Começa checando ontem
    }

    // Conta os dias seguidos
    for (const log of allLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0,0,0,0); // Garante que fuso horário não atrapalhe
      
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
      
      const hasLog = allLogs.some(log => log.date === dateStr);
      weeklyStatus.push(hasLog);
    }

    // --- ESTATÍSTICAS GERAIS ---
    const totalCheckins = allLogs.length;
    const achievedGoals = allLogs.filter(log => log.achievedGoal === 'sim').length;
    const goalPercentage = totalCheckins > 0 ? Math.round((achievedGoals / totalCheckins) * 100) : 0;

    // Retorna o objeto exatamente como o frontend precisa!
    return {
      streak:  streak,
  
      weekly: weeklyStatus,
      stats: {
        totalCheckins,
        goalPercentage,
        
        //subjectsStudied: 3, 
        //hoursStudied: 12
      }
    };
  }
}
