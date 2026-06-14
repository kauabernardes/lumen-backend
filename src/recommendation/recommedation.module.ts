import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from 'src/ai/ai.module';
import { AgendaEvent } from 'src/schema/agenda.enity';
import { RecommendationController } from './recommedation.controller';
import { RecommendationService } from './recommedation.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgendaEvent]), AiModule],
  controllers: [RecommendationController],
  providers: [RecommendationService],
})
export class RecommendationModule {}
