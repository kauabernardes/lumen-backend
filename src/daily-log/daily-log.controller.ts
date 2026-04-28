import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('daily-log')
export class DailyLogController {
  constructor(private readonly service: DailyLogService) {}

  @Post()
  async create(@Body() body: CreateDailyLogDto, @Req() req) {
    const userId = req.user.sub;

    const data = await this.service.create(body, userId);

    return {
      message: 'Registro criado com sucesso',
      data,
    };
  }

  @Get('summary')
  async getSummary(@Req() req) {
    const userId = req.user.id;
    return await this.service.getSummary(userId);
  }
}
