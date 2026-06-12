import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { RewardService } from './reward.service';
import { AuthGuard } from 'src/auth/guards/auth.guard'; 

@Controller('rewards')
@UseGuards(AuthGuard) 
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

 
  @Get()
  async getMyRewards(@Req() req) {
   
    return this.rewardService.getUserRewards(req.user.id);
  }
}