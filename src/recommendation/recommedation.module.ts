import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { AgendaEvent } from 'src/schema/agenda.entity'; 
import { AiService } from 'src/ai/ai.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([AgendaEvent]),
    AiModule 
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
})
export class RecommendationModule {}