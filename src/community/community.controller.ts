import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Request() req) {
    return `Olá ${req.user.sub}`;
  }
}
