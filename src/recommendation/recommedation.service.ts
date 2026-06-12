import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { AgendaEvent } from 'src/schema/agenda.entity';
import { AiService } from 'src/ai/ai.service';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(AgendaEvent)
    private readonly agendaRepo: Repository<AgendaEvent>,
    private readonly aiService: AiService,
  ) {}

  async getHomeRecommendation(userId: string) {
    const now = new Date();

    const nextEvent = await this.agendaRepo.findOne({
      where: {
        user: { id: userId },
        eventDate: MoreThanOrEqual(now),
      },
      order: { eventDate: 'ASC' },
    });

    if (!nextEvent) return null;

    const diffInMs = nextEvent.eventDate.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    const aiOutput = await this.aiService.generateRecommendation(
      nextEvent.title,
      nextEvent.description,
      diffInDays,
    );

    return {
      type: 'Recomendação',
      title: aiOutput.title,
      subtitle: aiOutput.subtitle, 
      action: 'Começar agora',
    };
  }
}