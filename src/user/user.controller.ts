import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('session/stats')
  @UseGuards(AuthGuard)
  getMonthlyChart(@Req() req) {
    return this.userService.getMonthlyStudyChart(req.user.sub);
  }
}
