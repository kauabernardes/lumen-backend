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
}