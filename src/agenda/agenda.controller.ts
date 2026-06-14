import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('my')
  @UseGuards(AuthGuard)
  async getMyAgenda(@Req() req) {
    return await this.agendaService.findAll(req.user.sub);
  }
}
