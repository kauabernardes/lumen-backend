import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UserService } from './user.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @UseGuards(AuthGuard)
  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @Req() req,
  ) {
    return this.userService.getUserProfile(
      Number(id),
      req.user.id,
    );
  }

  @UseGuards(AuthGuard)
  @Get('me/profile')
  async me(@Req() req) {
    return this.userService.getUserProfile(
      req.user.id,
      req.user.id,
    );
  }
}