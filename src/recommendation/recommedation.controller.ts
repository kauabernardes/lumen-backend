import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('recommendation')
@UseGuards(AuthGuard) 
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  async getRecommendation(@Req() req) {
    
    return this.recommendationService.getHomeRecommendation(req.user.id);
  }
}