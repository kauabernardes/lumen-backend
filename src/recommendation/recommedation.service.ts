import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

import { AiService } from 'src/ai/ai.service';
import { AgendaEvent } from 'src/schema/agenda.enity';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(AgendaEvent)
    private readonly agendaRepo: Repository<AgendaEvent>,
    private readonly aiService: AiService,
  ) {}

  async getHomeRecommendation(userId: string) {
    const now = new Date();

    const nextEvents = await this.agendaRepo.find({
      where: {
        user: { id: userId },
        eventDate: MoreThanOrEqual(now),
      },
      order: { eventDate: 'ASC' },
    });

    if (!nextEvents || nextEvents.length === 0) return null;

    const aiOutput = await this.aiService.generateRecommendation(nextEvents);

    return {
      type: 'Recomendação',
      title: aiOutput.title,
      subtitle: aiOutput.subtitle,
      action: 'Começar agora',
    };
  }
}
