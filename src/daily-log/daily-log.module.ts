import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyLog } from '../schema/daily-log.entity';
import { DailyLogService } from './daily-log.service';
import { DailyLogController } from './daily-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DailyLog])],
  controllers: [DailyLogController],
  providers: [DailyLogService],
})
export class DailyLogModule {}