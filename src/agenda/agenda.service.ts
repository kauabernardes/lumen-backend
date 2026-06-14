import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { AgendaEvent } from 'src/schema/agenda.enity';
import { v7 } from 'uuid';

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(AgendaEvent)
    private readonly agendaRepo: Repository<AgendaEvent>,
  ) {}

  async create(dto: CreateAgendaDto, userId: string): Promise<AgendaEvent> {
    const event = this.agendaRepo.create({
      ...dto,
      id: v7(),
      createdAt: new Date(),
      user: { id: userId },
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
    const result = await this.agendaRepo.delete({ id, user: { id: userId } });

    if (result.affected === 0) {
      throw new NotFoundException('Compromisso não encontrado.');
    }
  }
}
