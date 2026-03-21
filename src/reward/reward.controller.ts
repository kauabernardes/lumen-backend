import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { RewardService } from './reward.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async getRewardsByUser(@Request() req) {
    return this.rewardService.getRewardsByUser(req.user.sub);
  }
}
