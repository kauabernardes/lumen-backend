import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Create } from './dto/create.dto';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Request() req, @Body() payload: Create) {
    return this.communityService.create(payload, req.user.sub);
  }
}
