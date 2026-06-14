import { Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post()
  @UseGuards(AuthGuard)
  async createAgenda(@Req() req) {
    return await this.agendaService.create(req.body, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteAgenda(@Req() req) {
    return await this.agendaService.remove(req.params.id, req.user.sub);
  }
}
