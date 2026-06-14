import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { AgendaEvent } from 'src/schema/agenda.enity';

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(AgendaEvent)
    private readonly agendaRepo: Repository<AgendaEvent>,
  ) {}

  async create(dto: CreateAgendaDto, userId: string): Promise<AgendaEvent> {
    const event = this.agendaRepo.create({
      ...dto,
      user: { id: userId } as any,
    });
    return this.agendaRepo.save(event);
  }

  async findAll(userId: string): Promise<AgendaEvent[]> {
    return this.agendaRepo.find({
      where: { user: { id: userId }, eventDate: MoreThanOrEqual(new Date()) },
      order: { eventDate: 'ASC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const event = await this.agendaRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!event) throw new NotFoundException('Compromisso não encontrado.');
    await this.agendaRepo.remove(event);
  }
}
