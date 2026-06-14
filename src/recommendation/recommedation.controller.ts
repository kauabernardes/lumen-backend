import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { RecommendationService } from './recommedation.service';

@Controller('recommendation')
@UseGuards(AuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  async getRecommendation(@Req() req) {
    return this.recommendationService.getHomeRecommendation(req.user.sub);
  }
}
