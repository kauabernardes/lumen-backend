import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { RewardModule } from 'src/reward/reward.module';

@Module({
  providers: [AiService],
  exports: [AiService],
  imports: [RewardModule]
})
export class AiModule {}
