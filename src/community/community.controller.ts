import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Create } from './dto/create.dto';
import { PaginationDto } from 'src/util/dto/pagination.dto';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Request() req, @Body() payload: Create) {
    return this.communityService.create(payload, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @Request() req) {
    return this.communityService.join(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('recommended')
  async getRecommended(@Request() req, @Query() pagination: PaginationDto) {
    return this.communityService.getRecommended(req.user.sub, pagination);
  }
}
